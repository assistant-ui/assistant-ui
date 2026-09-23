import { htmlBlockNames, htmlRawNames } from "micromark-util-html-tag-name";
import remend, { type RemendOptions } from "remend";

const BACKTICK = 96;
const TILDE = 126;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const LESS_THAN = 60;
const DOLLAR = 36;
const GT = 62;
const SLASH = 47;
const ASTERISK = 42;
const PLUS = 43;
const DASH = 45;
const DOT = 46;
const CLOSE_PAREN = 41;
const BANG = 33;
const HASH = 35;
const DOUBLE_QUOTE = 34;
const APOSTROPHE = 39;
const DIGIT_ONE = 49;
const COLON = 58;
const EQUALS = 61;
const QUESTION = 63;
const UNDERSCORE = 95;

const isSpace = (c: number) => c === SPACE || c === TAB || c === CR;
const isDigit = (c: number) => c >= 48 && c <= 57;

function includesChar(
  text: string,
  code: number,
  from: number,
  to: number,
): boolean {
  for (let i = from; i < to; i += 1) {
    if (text.charCodeAt(i) === code) return true;
  }
  return false;
}

function onlyWhitespace(text: string, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (!isSpace(text.charCodeAt(i))) return false;
  }
  return true;
}

function dollarRunEnd(text: string, from: number, to: number): number {
  let end = from;
  while (end < to && text.charCodeAt(end) === DOLLAR) end += 1;
  return end;
}

function sizedDollarRunEnd(
  text: string,
  from: number,
  to: number,
  size: number,
): number {
  let i = from;
  while (i < to) {
    if (text.charCodeAt(i) === DOLLAR) {
      const end = dollarRunEnd(text, i, to);
      if (end - i === size) return end;
      i = end;
    } else {
      i += 1;
    }
  }
  return -1;
}

function skipListMarkers(text: string, from: number, lineEnd: number): number {
  let content = from;
  for (;;) {
    let end = content;
    while (
      end < lineEnd &&
      end - content < 9 &&
      isDigit(text.charCodeAt(end))
    ) {
      end += 1;
    }
    const c = text.charCodeAt(end);
    const isMarker =
      end > content
        ? c === DOT || c === CLOSE_PAREN
        : c === DASH || c === ASTERISK || c === PLUS;
    let next = end + 1;
    while (next < lineEnd && isSpace(text.charCodeAt(next))) next += 1;
    if (!isMarker || next === end + 1) return content;
    content = next;
  }
}

function columns(text: string, from: number, to: number): number {
  let column = 0;
  for (let i = from; i < to; i += 1) {
    column += text.charCodeAt(i) === TAB ? 4 - (column % 4) : 1;
  }
  return column;
}

const HTML_CLOSERS = ["", "", "-->", "?>", ">", "]]>"];
const RAW_END_TAGS = htmlRawNames.map((name) => `</${name}>`);

const isAsciiAlpha = (c: number) =>
  (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
const isAttributeNameStart = (c: number) =>
  isAsciiAlpha(c) || c === COLON || c === UNDERSCORE;

function endsUnquotedValue(c: number): boolean {
  return (
    isSpace(c) ||
    c === DOUBLE_QUOTE ||
    c === APOSTROPHE ||
    c === SLASH ||
    c === LESS_THAN ||
    c === EQUALS ||
    c === GT ||
    c === BACKTICK
  );
}

const isAttributeNameChar = (c: number) =>
  isAttributeNameStart(c) || isDigit(c) || c === DASH || c === DOT;

/**
 * The end of the value an attribute name ending at `from` carries, or -1 where micromark rejects the tag: an unquoted value may take another `=` and value, and a quoted one must be followed by `/`, `>` or whitespace.
 */
function attributeEnd(text: string, from: number, lineEnd: number): number {
  let i = from;
  for (;;) {
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    if (text.charCodeAt(i) !== EQUALS) return i;
    i += 1;
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    const c = text.charCodeAt(i);
    if (
      i === lineEnd ||
      c === LESS_THAN ||
      c === EQUALS ||
      c === GT ||
      c === BACKTICK
    ) {
      return -1;
    }
    if (c === DOUBLE_QUOTE || c === APOSTROPHE) {
      i += 1;
      while (i < lineEnd && text.charCodeAt(i) !== c) i += 1;
      if (i === lineEnd) return -1;
      const after = text.charCodeAt(i + 1);
      return after === SLASH || after === GT || isSpace(after) ? i + 1 : -1;
    }
    while (i < lineEnd && !endsUnquotedValue(text.charCodeAt(i))) i += 1;
  }
}

/**
 * Whether the tag whose name ends at `from` is complete and followed by nothing but whitespace on its line, as micromark reads the tag that opens an HTML block of the seventh kind.
 */
function completeTagEnds(
  text: string,
  from: number,
  lineEnd: number,
  closing: boolean,
): boolean {
  let i = from;
  while (!closing) {
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    if (text.charCodeAt(i) === SLASH) {
      i += 1;
      break;
    }
    if (!isAttributeNameStart(text.charCodeAt(i))) break;
    i += 1;
    while (i < lineEnd && isAttributeNameChar(text.charCodeAt(i))) i += 1;
    i = attributeEnd(text, i, lineEnd);
    if (i === -1) return false;
  }
  if (closing) {
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
  }
  return (
    i < lineEnd &&
    text.charCodeAt(i) === GT &&
    onlyWhitespace(text, i + 1, lineEnd)
  );
}

/**
 * The kind, numbered one to seven as CommonMark numbers them, of the HTML block that the `<` at `from` opens, or 0. `complete` says whether a line holding only a complete tag of any other name may open the seventh kind there.
 */
function htmlBlockKind(
  text: string,
  from: number,
  lineEnd: number,
  complete: boolean,
): number {
  let i = from + 1;
  const c = text.charCodeAt(i);
  if (c === BANG) {
    if (text.startsWith("--", i + 1)) return 2;
    if (text.startsWith("[CDATA[", i + 1)) return 5;
    return isAsciiAlpha(text.charCodeAt(i + 1)) ? 4 : 0;
  }
  if (c === QUESTION) return 3;
  const closing = c === SLASH;
  if (closing) i += 1;
  if (!isAsciiAlpha(text.charCodeAt(i))) return 0;
  const nameStart = i;
  while (
    i < lineEnd &&
    (isAsciiAlpha(text.charCodeAt(i)) ||
      isDigit(text.charCodeAt(i)) ||
      text.charCodeAt(i) === DASH)
  ) {
    i += 1;
  }
  const after = text.charCodeAt(i);
  if (i < lineEnd && after !== GT && after !== SLASH && !isSpace(after)) {
    return 0;
  }
  const name = text.slice(nameStart, i).toLowerCase();
  if (!closing && after !== SLASH && htmlRawNames.includes(name)) return 1;
  if (htmlBlockNames.includes(name)) {
    return after !== SLASH || text.charCodeAt(i + 1) === GT ? 6 : 0;
  }
  return complete && completeTagEnds(text, i, lineEnd, closing) ? 7 : 0;
}

function isAtxHeading(text: string, from: number, lineEnd: number): boolean {
  let end = from;
  while (end < lineEnd && text.charCodeAt(end) === HASH) end += 1;
  return (
    end > from &&
    end - from <= 6 &&
    (end === lineEnd || isSpace(text.charCodeAt(end)))
  );
}

/**
 * Whether the line from `from` is a thematic break, or a setext underline when `underline` says a paragraph line precedes it.
 */
function isRuleLine(
  text: string,
  from: number,
  lineEnd: number,
  underline: boolean,
): boolean {
  const marker = text.charCodeAt(from);
  if (
    marker !== DASH &&
    marker !== ASTERISK &&
    marker !== UNDERSCORE &&
    marker !== EQUALS
  ) {
    return false;
  }
  let count = 0;
  let spaced = false;
  let run = true;
  for (let k = from; k < lineEnd; k += 1) {
    const c = text.charCodeAt(k);
    if (c === marker) {
      count += 1;
      if (spaced) run = false;
    } else if (isSpace(c)) {
      spaced = true;
    } else {
      return false;
    }
  }
  return (
    (marker !== EQUALS && count >= 3) ||
    (underline && run && (marker === EQUALS || marker === DASH))
  );
}

function htmlBlockEnds(
  text: string,
  kind: number,
  from: number,
  lineEnd: number,
): boolean {
  const line = text.slice(from, lineEnd);
  if (kind !== 1) return line.includes(HTML_CLOSERS[kind]!);
  const lower = line.toLowerCase();
  return RAW_END_TAGS.some((tag) => lower.includes(tag));
}

type BlockScan = {
  boundary: number;
  protectedRanges: number[];
  openStart: number;
  katexCloses: boolean;
};

/**
 * `boundary` is the start of the last block outside open code fences, HTML blocks and `$$` math, `protectedRanges` holds the closed fences, HTML blocks, `$$` blocks and the inline math that starts a line as flat start/end pairs, `openStart` is the start of the fence, HTML block or `$$` block still open at the end, or -1, and `katexCloses` says whether remend's katex completion, a bare `$$` line, closes that block: math two dollars opened outside a blockquote and outside the list item of its opening line. A range starts at a line start because remend drops a trailing space from its input, so a cut inside a line would lose one.
 *
 * A fence opens at any indentation, since a marker indented four or more columns is either a fence nested in a list item or an indented code block. It closes on a marker at its opener's blockquote depth indented at most three characters past the opener, counting a tab as one, as `fenceEnd` in preprocess reads them, so a deeper marker stays body as CommonMark reads it. A fence or `$$` block also opens after the list markers of its line, and then ends with that list item at the first line indented fewer columns than the item's content, with a tab stop every four columns as CommonMark sets them. A block opened in a blockquote ends with it, at the first line carrying fewer quote markers than its opener, a blank one included, while a marker past the opener's depth is body, so a list item's content column is measured up to the first such marker and a deeper marker closes nothing. A bare `>` line is blank inside a blockquote but opens a new block after a blank line.
 *
 * An HTML block opens at a line whose content, indented less than four columns past quote markers themselves indented less than four, starts one of the seven kinds micromark reads, and its body is raw, so a fence or math marker inside it opens nothing. A `pre`, `script`, `style` or `textarea` tag runs to the first line holding any of their end tags, a comment, processing instruction, declaration or CDATA section to the first line holding its closer, and a known block tag or any other complete tag alone on its line to the next blank line at its blockquote depth. A block opened after list markers ends with that item like a fence, and one opened on an indented line without them ends at the first line indented less, which stands in for the item it continues. A lone complete tag of any other name cannot interrupt a paragraph, so it opens a block only after a blank line, a block's last line, a heading, a thematic break or a setext underline in the same blockquote, or where its line starts a blockquote or a list item, and list markers of an ordered item numbered other than 1 continue a paragraph that did not start on a list item line, so nothing opens after them there. The scan reads a table row or an indented code line as paragraph text, so a tag line right after one stays prose.
 *
 * Dollars follow remark-math. A run of two or more that starts the content of a line opens a `$$` block when no other dollar follows it on that line, and the block closes like a fence, on a line holding only a dollar run at least as long. Its body is raw, so a fence marker inside it opens nothing. Any other such run opens inline math, which is protected up to the next run of exactly its length on the same line, even one after a backslash, since math reads a backslash as content rather than an escape. Inline math that starts anywhere else or closes on a later line stays in the prose, because pairing it takes the paragraph structure this scan does not track.
 */
function scanBlocks(text: string): BlockScan {
  const n = text.length;
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;
  let fenceStart = 0;
  let fenceIndent = 0;
  let fenceQuoteDepth = 0;
  let inMath = false;
  let mathStart = 0;
  let mathRun = 0;
  let mathIndent = 0;
  let mathQuoteDepth = 0;
  let inHtml = false;
  let htmlKind = 0;
  let htmlStart = 0;
  let htmlQuoteDepth = 0;
  let itemIndent = 0;
  let inParagraph = false;
  let paragraphInItem = false;
  let lastQuoteDepth = 0;
  let boundary = 0;
  let pending = -1;
  const protectedRanges: number[] = [];

  for (let lineStart = 0; lineStart <= n;) {
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = n;

    const blockQuoteDepth = inHtml
      ? htmlQuoteDepth
      : inMath
        ? mathQuoteDepth
        : inFence
          ? fenceQuoteDepth
          : 0;
    let i = lineStart;
    let quoteDepth = 0;
    let quoteStart = lineStart;
    let blockContentStart = lineStart;
    let contentStart = lineStart;
    let indentedMarker = false;
    while (i < lineEnd) {
      const c = text.charCodeAt(i);
      if (c === GT) {
        if (columns(text, contentStart, i) > 3) indentedMarker = true;
        if (quoteDepth === blockQuoteDepth) quoteStart = i;
        quoteDepth += 1;
        contentStart = text.charCodeAt(i + 1) === SPACE ? i + 2 : i + 1;
        if (quoteDepth === blockQuoteDepth) blockContentStart = contentStart;
      } else if (!isSpace(c)) {
        break;
      }
      i += 1;
    }

    const first = i < lineEnd ? text.charCodeAt(i) : -1;
    const leavesQuote =
      quoteDepth < blockQuoteDepth && (first !== -1 || lineEnd < n);
    const leavesItem =
      itemIndent !== 0 &&
      (quoteDepth > blockQuoteDepth
        ? columns(text, blockContentStart, quoteStart) < itemIndent
        : first !== -1 && columns(text, contentStart, i) < itemIndent);

    if ((inFence || inMath || inHtml) && (leavesQuote || leavesItem)) {
      protectedRanges.push(
        inHtml ? htmlStart : inMath ? mathStart : fenceStart,
        lineStart - 1,
      );
      inFence = false;
      inMath = false;
      inHtml = false;
      boundary = lineStart;
      pending = -1;
    }

    let closesBlock = false;
    if (inHtml) {
      if (htmlKind > 5) {
        if (lineEnd < n && onlyWhitespace(text, blockContentStart, lineEnd)) {
          protectedRanges.push(htmlStart, lineStart - 1);
          inHtml = false;
        }
      } else if (htmlBlockEnds(text, htmlKind, blockContentStart, lineEnd)) {
        protectedRanges.push(htmlStart, lineEnd);
        inHtml = false;
        closesBlock = true;
      }
    }

    const blockStart =
      inFence || inMath || inHtml ? i : skipListMarkers(text, i, lineEnd);
    const blockItemIndent =
      blockStart === i ? 0 : columns(text, contentStart, blockStart);
    const blockFirst = blockStart < lineEnd ? text.charCodeAt(blockStart) : -1;
    const shallow = !indentedMarker && columns(text, contentStart, i) < 4;
    const markersInProse: boolean =
      blockStart !== i &&
      inParagraph &&
      !paragraphInItem &&
      isDigit(first) &&
      (first !== DIGIT_ONE || isDigit(text.charCodeAt(i + 1)));

    if (
      !closesBlock &&
      !inMath &&
      !inHtml &&
      (blockFirst === BACKTICK || blockFirst === TILDE)
    ) {
      let run = blockStart;
      while (run < lineEnd && text.charCodeAt(run) === blockFirst) run += 1;
      if (
        run - blockStart >= 3 &&
        (inFence ||
          blockFirst === TILDE ||
          !includesChar(text, BACKTICK, run, lineEnd))
      ) {
        if (!inFence) {
          inFence = true;
          fenceChar = blockFirst;
          fenceRun = run - blockStart;
          fenceStart = lineStart;
          fenceIndent = blockStart - contentStart;
          fenceQuoteDepth = quoteDepth;
          itemIndent = blockItemIndent;
        } else if (
          blockFirst === fenceChar &&
          quoteDepth === fenceQuoteDepth &&
          blockStart - contentStart <= fenceIndent + 3 &&
          run - blockStart >= fenceRun &&
          onlyWhitespace(text, run, lineEnd)
        ) {
          inFence = false;
          closesBlock = true;
          protectedRanges.push(fenceStart, lineEnd);
        }
      }
    }

    if (
      blockFirst === LESS_THAN &&
      shallow &&
      !markersInProse &&
      !closesBlock &&
      !inFence &&
      !inMath &&
      !inHtml
    ) {
      htmlKind = htmlBlockKind(
        text,
        blockStart,
        lineEnd,
        !inParagraph || quoteDepth > lastQuoteDepth || blockStart !== i,
      );
      if (
        htmlKind !== 0 &&
        htmlKind < 6 &&
        htmlBlockEnds(text, htmlKind, blockStart, lineEnd)
      ) {
        protectedRanges.push(lineStart, lineEnd);
        closesBlock = true;
      } else if (htmlKind !== 0) {
        inHtml = true;
        htmlStart = lineStart;
        htmlQuoteDepth = quoteDepth;
        itemIndent =
          blockStart === i ? columns(text, contentStart, i) : blockItemIndent;
      }
    }

    if (!closesBlock && !inFence && !inHtml) {
      if (inMath) {
        if (
          first === DOLLAR &&
          quoteDepth === mathQuoteDepth &&
          i - contentStart <= mathIndent + 3
        ) {
          const end = dollarRunEnd(text, i, lineEnd);
          if (end - i >= mathRun && onlyWhitespace(text, end, lineEnd)) {
            protectedRanges.push(mathStart, end);
            inMath = false;
            closesBlock = true;
          }
        }
      } else if (blockFirst === DOLLAR) {
        const openEnd = dollarRunEnd(text, blockStart, lineEnd);
        const dollars = openEnd - blockStart;
        if (dollars >= 2 && !includesChar(text, DOLLAR, openEnd, lineEnd)) {
          inMath = true;
          mathStart = lineStart;
          mathRun = dollars;
          mathIndent = blockStart - contentStart;
          mathQuoteDepth = quoteDepth;
          itemIndent = blockItemIndent;
        } else if (dollars >= 2) {
          const end = sizedDollarRunEnd(text, openEnd, lineEnd, dollars);
          if (end !== -1) protectedRanges.push(lineStart, end);
        }
      }
    }

    if (
      first === -1 &&
      !inFence &&
      !inMath &&
      !inHtml &&
      !(quoteDepth > 0 && pending !== -1)
    ) {
      pending = lineEnd + 1;
    } else if (pending !== -1) {
      boundary = pending;
      pending = -1;
    }

    if (!inFence && !inMath && !inHtml) itemIndent = 0;
    const continued: boolean = inParagraph;
    inParagraph =
      first !== -1 &&
      !inFence &&
      !inMath &&
      !inHtml &&
      !closesBlock &&
      !(
        shallow &&
        (isAtxHeading(text, markersInProse ? i : blockStart, lineEnd) ||
          isRuleLine(
            text,
            i,
            lineEnd,
            inParagraph && quoteDepth === lastQuoteDepth,
          ) ||
          (blockStart !== i &&
            !markersInProse &&
            isRuleLine(text, blockStart, lineEnd, false)))
      );
    if (inParagraph) {
      paragraphInItem =
        (blockStart !== i && !markersInProse) || (continued && paragraphInItem);
    }
    lastQuoteDepth = quoteDepth;
    lineStart = lineEnd + 1;
  }

  const openStart = inHtml
    ? htmlStart
    : inMath
      ? mathStart
      : inFence
        ? fenceStart
        : -1;
  return {
    boundary,
    protectedRanges,
    openStart,
    katexCloses:
      inMath && mathRun === 2 && mathQuoteDepth === 0 && itemIndent === 0,
  };
}

/**
 * Returns the start of the last block outside open code fences, HTML blocks and `$$` math.
 * Completion can use this boundary, but escapes must also reach earlier text.
 */
export function findRemendWindowStart(text: string): number {
  return scanBlocks(text).boundary;
}

/**
 * Options remend applies to text anywhere in the message rather than to an
 * incomplete construct at its end, plus `linkMode`, which only configures the
 * disabled `links` handler. Every other option completes a dangling opener,
 * which mutates or deletes a block that has already settled, so the settled
 * passes disable all of them. The two escapes skip backtick fences and inline
 * spans but not `~~~` fences, HTML blocks or math, so remend only ever receives
 * the text between the protected blocks the scan found.
 */
type PrefixSafeOption =
  | "singleTilde"
  | "comparisonOperators"
  | "handlers"
  | "linkMode";

const COMPLETION_OFF = {
  bold: false,
  boldItalic: false,
  italic: false,
  inlineCode: false,
  strikethrough: false,
  katex: false,
  inlineKatex: false,
  links: false,
  images: false,
  htmlTags: false,
  setextHeadings: false,
} satisfies Record<Exclude<keyof RemendOptions, PrefixSafeOption>, false>;

/**
 * Repairs incomplete Markdown in the final block, cut down to the prose after its last fence, HTML block or `$$` block, and applies text escapes to every earlier run of prose. Closed fences, HTML blocks, `$$` blocks and the inline math that starts a line are copied raw, an open fence or HTML block is copied raw to the end, and an open `$$` block receives nothing but the `katex` completion, unless three or more dollars opened it or it sits in a blockquote or list item, since that completion writes a bare `$$` line that cannot close it there. The prose before a block has settled: remend cannot see `~~~` fences, HTML blocks or math, so completing it would append the closer after the block, and a paragraph a block interrupted renders as written. Custom handlers receive each run of prose as a separate call.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const { boundary, protectedRanges, openStart, katexCloses } =
    scanBlocks(text);
  if (boundary <= 0 && protectedRanges.length === 0 && openStart === -1) {
    return remend(text, options);
  }

  const prefixOptions = { ...options, ...COMPLETION_OFF };
  let out = "";
  let cursor = 0;
  for (let k = 0; k + 1 < protectedRanges.length; k += 2) {
    const from = protectedRanges[k]!;
    const to = protectedRanges[k + 1]!;
    out +=
      remend(text.slice(cursor, from), prefixOptions) + text.slice(from, to);
    cursor = to;
  }

  if (openStart !== -1) {
    out += remend(text.slice(cursor, openStart), prefixOptions);
    const tail = text.slice(openStart);
    if (!katexCloses) return out + tail;
    return (
      out +
      remend(tail, {
        ...prefixOptions,
        katex: options?.katex !== false,
        singleTilde: false,
        comparisonOperators: false,
        handlers: [],
      })
    );
  }

  const start = Math.max(cursor, boundary);
  return (
    out +
    remend(text.slice(cursor, start), prefixOptions) +
    remend(text.slice(start), options)
  );
}
