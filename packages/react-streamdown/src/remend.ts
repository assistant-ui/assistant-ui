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

const HTML_RAW_NAMES = ["pre", "script", "style", "textarea"];
const HTML_BLOCK_NAMES = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
];

type HtmlBlock = {
  kind: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
};

function isAsciiAlpha(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

function isAsciiAlphaNumeric(c: number): boolean {
  return isAsciiAlpha(c) || isDigit(c);
}

function isHtmlAttributeNameStart(c: number): boolean {
  return isAsciiAlpha(c) || c === 58 || c === 95;
}

function isHtmlAttributeNameChar(c: number): boolean {
  return (
    isHtmlAttributeNameStart(c) ||
    isAsciiAlphaNumeric(c) ||
    c === DASH ||
    c === 46
  );
}

function isHtmlUnquotedAttributeChar(c: number): boolean {
  return (
    !isSpace(c) &&
    c !== 34 &&
    c !== 39 &&
    c !== SLASH &&
    c !== LESS_THAN &&
    c !== 61 &&
    c !== GT &&
    c !== 96
  );
}

function htmlTagEnd(text: string, from: number, lineEnd: number): number {
  let i = from + 1;
  if (text.charCodeAt(i) === SLASH) i += 1;
  if (!isAsciiAlpha(text.charCodeAt(i))) return -1;
  while (
    i < lineEnd &&
    (isAsciiAlphaNumeric(text.charCodeAt(i)) || text.charCodeAt(i) === DASH)
  ) {
    i += 1;
  }

  if (text.charCodeAt(from + 1) === SLASH) {
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    return text.charCodeAt(i) === GT ? i : -1;
  }

  for (;;) {
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    const c = text.charCodeAt(i);
    if (c === GT) return i;
    if (c === SLASH) {
      return text.charCodeAt(i + 1) === GT ? i + 1 : -1;
    }
    if (!isHtmlAttributeNameStart(c)) return -1;
    i += 1;
    while (i < lineEnd && isHtmlAttributeNameChar(text.charCodeAt(i))) {
      i += 1;
    }
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    if (text.charCodeAt(i) !== 61) continue;
    i += 1;
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;
    const quote = text.charCodeAt(i);
    if (quote === 34 || quote === 39) {
      i += 1;
      while (i < lineEnd && text.charCodeAt(i) !== quote) i += 1;
      if (text.charCodeAt(i) !== quote) return -1;
      i += 1;
      continue;
    }
    const valueStart = i;
    while (i < lineEnd && isHtmlUnquotedAttributeChar(text.charCodeAt(i))) {
      i += 1;
    }
    if (i === valueStart) return -1;
  }
}

function htmlBlockAt(
  text: string,
  from: number,
  lineEnd: number,
): HtmlBlock | null {
  if (text.charCodeAt(from) !== LESS_THAN) return null;
  if (text.startsWith("<!--", from)) return { kind: 2, name: "" };
  if (text.startsWith("<?", from)) return { kind: 3, name: "" };
  if (text.startsWith("<![CDATA[", from)) return { kind: 5, name: "" };
  if (
    text.charCodeAt(from + 1) === 33 &&
    isAsciiAlpha(text.charCodeAt(from + 2))
  ) {
    return { kind: 4, name: "" };
  }

  let i = from + 1;
  const closing = text.charCodeAt(i) === SLASH;
  if (closing) i += 1;
  if (!isAsciiAlpha(text.charCodeAt(i))) return null;
  const nameStart = i;
  while (
    i < lineEnd &&
    (isAsciiAlphaNumeric(text.charCodeAt(i)) || text.charCodeAt(i) === DASH)
  ) {
    i += 1;
  }
  const name = text.slice(nameStart, i).toLowerCase();
  const next = text.charCodeAt(i);
  const nameBoundary =
    i === lineEnd || next === GT || next === SLASH || isSpace(next);

  if (!closing && HTML_RAW_NAMES.includes(name) && nameBoundary) {
    return { kind: 1, name };
  }
  if (HTML_BLOCK_NAMES.includes(name) && nameBoundary) {
    return { kind: 6, name: "" };
  }

  const end = htmlTagEnd(text, from, lineEnd);
  if (end === -1 || !onlyWhitespace(text, end + 1, lineEnd)) return null;
  return { kind: 7, name: "" };
}

function hasHtmlClose(
  text: string,
  kind: HtmlBlock["kind"],
  name: string,
  from: number,
  lineEnd: number,
): boolean {
  const marker =
    kind === 2
      ? "-->"
      : kind === 3
        ? "?>"
        : kind === 4
          ? ">"
          : kind === 5
            ? "]]>"
            : "";
  if (marker !== "") {
    for (let i = from; i + marker.length <= lineEnd; i += 1) {
      if (text.startsWith(marker, i)) return true;
    }
    return false;
  }

  if (kind !== 1) return false;
  for (let i = from; i + name.length + 3 <= lineEnd; i += 1) {
    if (text.charCodeAt(i) !== LESS_THAN || text.charCodeAt(i + 1) !== SLASH) {
      continue;
    }
    if (
      text.slice(i + 2, i + 2 + name.length).toLowerCase() === name &&
      text.charCodeAt(i + 2 + name.length) === GT
    ) {
      return true;
    }
  }
  return false;
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
 * HTML follows CommonMark's seven HTML block conditions. Type 1 raw tags close on their matching end tag, types 2 through 5 close on their respective markers, and types 6 and 7 close on a blank line. Its body is raw, so a fence or math marker inside it opens nothing.
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
  let htmlBlock: HtmlBlock | null = null;
  let htmlStart = 0;
  let htmlQuoteDepth = 0;
  let itemIndent = 0;
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
    while (i < lineEnd) {
      const c = text.charCodeAt(i);
      if (c === GT) {
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
      htmlBlock = null;
      boundary = lineStart;
      pending = -1;
    }

    let htmlClosed = false;
    if (inHtml) {
      if (
        (htmlBlock!.kind >= 6 && first === -1) ||
        hasHtmlClose(text, htmlBlock!.kind, htmlBlock!.name, i, lineEnd)
      ) {
        protectedRanges.push(htmlStart, lineEnd);
        htmlClosed = true;
        inHtml = false;
        htmlBlock = null;
      } else {
        lineStart = lineEnd + 1;
        continue;
      }
    }

    const blockStart =
      inFence || inMath || inHtml ? i : skipListMarkers(text, i, lineEnd);
    const blockItemIndent =
      blockStart === i ? 0 : columns(text, contentStart, blockStart);
    const blockFirst = blockStart < lineEnd ? text.charCodeAt(blockStart) : -1;

    if (
      !htmlClosed &&
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
          protectedRanges.push(fenceStart, lineEnd);
        }
      }
    }

    if (!htmlClosed && !inFence && !inHtml) {
      const html =
        blockStart - contentStart <= 3
          ? htmlBlockAt(text, blockStart, lineEnd)
          : null;
      if (html !== null) {
        inHtml = true;
        htmlBlock = html;
        htmlStart = lineStart;
        htmlQuoteDepth = quoteDepth;
        itemIndent = blockItemIndent;
        if (hasHtmlClose(text, html.kind, html.name, blockStart, lineEnd)) {
          protectedRanges.push(htmlStart, lineEnd);
          inHtml = false;
          htmlBlock = null;
        }
      }
    }

    if (!htmlClosed && !inFence && !inHtml) {
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
      !inHtml &&
      inMath &&
      mathRun === 2 &&
      mathQuoteDepth === 0 &&
      itemIndent === 0,
  };
}

/**
 * Returns the start of the last block outside open code fences, HTML blocks and
 * `$$` math.
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
