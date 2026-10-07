import { htmlBlockNames, htmlRawNames } from "micromark-util-html-tag-name";

/**
 * Text transforms for the `preprocess` prop of `MarkdownTextPrimitive` and `StreamdownTextPrimitive`.
 *
 * Language models routinely emit math in delimiters that remark-math does not
 * recognize (LaTeX `\(...\)` / `\[...\]` brackets, `[/math]` / `[/inline]` tags),
 * and they write currency amounts (`$5`) that single-dollar math otherwise eats.
 * These helpers normalize that output to the `$...$` / `$$...$$` form remark-math
 * parses. During streaming, smoothing reveals the raw accumulated text first,
 * then `preprocess` runs on that revealed prefix before the parser sees it.
 * Compose them in `preprocess`.
 */

const BACKTICK = 96;
const TILDE = 126;
const DOLLAR = 36;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const LESS_THAN = 60;
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
const LBRACKET = 91;
const RBRACKET = 93;
const CARET = 94;
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

function listMarkerEnd(text: string, from: number, lineEnd: number): number {
  let end = from;
  while (end < lineEnd && end - from < 9 && isDigit(text.charCodeAt(end))) {
    end += 1;
  }
  const c = text.charCodeAt(end);
  const isMarker =
    end > from
      ? c === DOT || c === CLOSE_PAREN
      : c === DASH || c === ASTERISK || c === PLUS;
  let next = end + 1;
  while (next < lineEnd && isSpace(text.charCodeAt(next))) next += 1;
  return !isMarker || next === end + 1 ? from : next;
}

function skipListMarkers(text: string, from: number, lineEnd: number): number {
  let content = from;
  for (;;) {
    const next = listMarkerEnd(text, content, lineEnd);
    if (next === content) return content;
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

const HTML_CLOSERS = ["", "", "-->", "?>", ">"];
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
  if (kind === 5) {
    for (let i = from; i < lineEnd; i += 1) {
      if (text.charCodeAt(i) === 93 && text.charCodeAt(i + 1) === 93) {
        i += 1;
        if (text.charCodeAt(i + 1) === GT) return true;
      }
    }
    return false;
  }
  const line = text.slice(from, lineEnd);
  if (kind !== 1) return line.includes(HTML_CLOSERS[kind]!);
  const lower = line.toLowerCase();
  return RAW_END_TAGS.some((tag) => lower.includes(tag));
}

function htmlBlockRanges(text: string): number[] {
  const ranges: number[] = [];
  const listItems: { content: number; depth: number; footnote: boolean }[] = [];
  let codeStart = -1;
  let codeIndent = 0;
  let codeQuoteDepth = 0;
  let previousBlank = true;
  let previousHeading = false;
  let previousFenceClose = false;
  let htmlKind = 0;
  let htmlStart = 0;
  let htmlQuoteDepth = 0;
  let htmlItemIndent = 0;
  let htmlQuoteIndents: number[] = [];
  let fenceChar = 0;
  let fenceRun = 0;
  let fenceIndent = 0;
  let fenceQuoteDepth = 0;
  let mathEnd = 0;
  let mathQuoteDepth = 0;
  let mathItemIndent = 0;
  let mathQuoteIndents: number[] = [];
  let inParagraph = false;
  let paragraphItemIndent = 0;
  let lastQuoteDepth = 0;

  for (let lineStart = 0; lineStart < text.length;) {
    let lineEnd = lineStart;
    while (
      lineEnd < text.length &&
      text.charCodeAt(lineEnd) !== 10 &&
      text.charCodeAt(lineEnd) !== CR
    )
      lineEnd += 1;
    const nextLine =
      text.charCodeAt(lineEnd) === CR && text.charCodeAt(lineEnd + 1) === 10
        ? lineEnd + 2
        : lineEnd + 1;
    const blockQuoteDepth =
      htmlKind !== 0
        ? htmlQuoteDepth
        : lineStart < mathEnd
          ? mathQuoteDepth
          : fenceQuoteDepth;
    let i = lineStart;
    let depth = 0;
    let quoteStart = lineStart;
    let blockContentStart = lineStart;
    let contentStart = lineStart;
    let indentedMarker = false;
    const quoteIndents: number[] = [];
    while (i < lineEnd) {
      const c = text.charCodeAt(i);
      if (c === GT) {
        const quoteIndent = columns(text, contentStart, i);
        quoteIndents.push(quoteIndent);
        if (quoteIndent > 3) indentedMarker = true;
        if (depth === blockQuoteDepth) quoteStart = i;
        depth += 1;
        contentStart = text.charCodeAt(i + 1) === SPACE ? i + 2 : i + 1;
        if (depth === blockQuoteDepth) blockContentStart = contentStart;
      } else if (!isSpace(c)) {
        break;
      }
      i += 1;
    }
    const first = i < lineEnd ? text.charCodeAt(i) : -1;
    const indent = columns(text, contentStart, i);
    if (
      htmlKind !== 0 &&
      (depth < htmlQuoteDepth ||
        htmlQuoteIndents.some(
          (indent, level) => quoteIndents[level]! < indent,
        ) ||
        (htmlItemIndent !== 0 &&
          (depth > htmlQuoteDepth
            ? columns(text, blockContentStart, quoteStart) < htmlItemIndent
            : first !== -1 && indent < htmlItemIndent)))
    ) {
      ranges.push(htmlStart, lineStart);
      htmlKind = 0;
    }
    if (htmlKind !== 0) {
      if (htmlKind > 5 && onlyWhitespace(text, blockContentStart, lineEnd)) {
        ranges.push(htmlStart, lineStart);
        htmlKind = 0;
      } else {
        if (
          htmlKind < 6 &&
          htmlBlockEnds(text, htmlKind, blockContentStart, lineEnd)
        ) {
          ranges.push(htmlStart, lineEnd);
          htmlKind = 0;
        }
        previousBlank = false;
        previousHeading = false;
        previousFenceClose = false;
        lineStart = nextLine;
        continue;
      }
    }
    if (
      fenceChar !== 0 &&
      (depth < fenceQuoteDepth ||
        (fenceChar === DOLLAR && first !== -1 && indent < fenceIndent))
    )
      fenceChar = 0;
    if (fenceChar !== 0) {
      let end = i;
      while (end < lineEnd && text.charCodeAt(end) === fenceChar) end += 1;
      const closesFence =
        depth === fenceQuoteDepth &&
        (fenceChar === DOLLAR ? indent : i - contentStart) <= fenceIndent + 3 &&
        end - i >= fenceRun &&
        onlyWhitespace(text, end, lineEnd);
      if (closesFence) fenceChar = 0;
      previousBlank = false;
      previousHeading = false;
      previousFenceClose = closesFence;
      lineStart = nextLine;
      continue;
    }
    if (lineStart < mathEnd) {
      if (
        depth < mathQuoteDepth ||
        mathQuoteIndents.some(
          (indent, level) => quoteIndents[level]! < indent,
        ) ||
        (mathItemIndent !== 0 &&
          (depth > mathQuoteDepth
            ? columns(text, blockContentStart, quoteStart) < mathItemIndent
            : first !== -1 && indent < mathItemIndent))
      ) {
        mathEnd = 0;
      } else {
        previousBlank = false;
        previousHeading = false;
        previousFenceClose = false;
        lineStart = nextLine;
        continue;
      }
    }
    if (codeStart !== -1) {
      if (first === -1 || (depth === codeQuoteDepth && indent >= codeIndent)) {
        previousBlank = first === -1;
        lineStart = nextLine;
        continue;
      }
      ranges.push(codeStart, lineStart);
      codeStart = -1;
    }
    while (
      listItems.length > 0 &&
      depth < listItems[listItems.length - 1]!.depth
    )
      listItems.pop();
    if (previousBlank && first !== -1) {
      while (listItems.length > 0) {
        const item = listItems[listItems.length - 1]!;
        if (depth !== item.depth || indent >= item.content) break;
        listItems.pop();
      }
    }
    const listItem = listItems[listItems.length - 1];
    const codeColumn = listItem?.footnote
      ? Number.POSITIVE_INFINITY
      : (listItem?.content ?? 0) + 4;
    // Inside a blockquote the four-space rule counts past its markers: a quote
    // nested in a list item needs only four spaces past `>` for indented code,
    // while a list item at the quote's own depth still needs its content
    // column. A `>` indented four or more spaces is literal text instead, so
    // the absolute column of the first marker decides then.
    const nestedQuote =
      depth > 0 &&
      !indentedMarker &&
      !listItem?.footnote &&
      (listItem == null || listItem.depth < depth);
    const requiredCodeIndent = nestedQuote ? 4 : codeColumn;
    const absoluteIndent = depth > 0 ? quoteIndents[0]! : indent;
    if (
      first !== -1 &&
      (indent >= requiredCodeIndent || absoluteIndent >= codeColumn) &&
      (previousBlank || previousHeading || previousFenceClose) &&
      !(first === TILDE && opensTildeFence(text, i)) &&
      !(first === BACKTICK && opensBacktickFence(text, i))
    ) {
      codeStart = lineStart;
      codeIndent = indent >= requiredCodeIndent ? requiredCodeIndent : 4;
      codeQuoteDepth = depth;
      previousBlank = false;
      previousHeading = false;
      previousFenceClose = false;
      lineStart = nextLine;
      continue;
    }
    let blockStart = skipListMarkers(text, i, lineEnd);
    let blockItemIndent =
      blockStart === i ? 0 : columns(text, contentStart, blockStart);
    const outerListIndent = blockItemIndent;
    const outerListDepth = depth;
    const shallow = !indentedMarker && indent < 4;
    const markersInProse: boolean =
      blockStart !== i &&
      inParagraph &&
      depth === lastQuoteDepth &&
      indent >= paragraphItemIndent &&
      isDigit(first) &&
      (first !== DIGIT_ONE || isDigit(text.charCodeAt(i + 1)));

    const blockQuoteIndents: number[] = [];
    if (!markersInProse) {
      while (blockStart < lineEnd && text.charCodeAt(blockStart) === GT) {
        blockQuoteIndents[depth] = blockItemIndent;
        depth += 1;
        blockStart += 1;
        if (text.charCodeAt(blockStart) === SPACE) blockStart += 1;
        contentStart = blockStart;
        while (blockStart < lineEnd && isSpace(text.charCodeAt(blockStart)))
          blockStart += 1;
        const next = skipListMarkers(text, blockStart, lineEnd);
        blockItemIndent =
          next === blockStart ? 0 : columns(text, contentStart, next);
        blockStart = next;
      }
    }
    const blockFirst = blockStart < lineEnd ? text.charCodeAt(blockStart) : -1;

    if (first !== -1 && !markersInProse) {
      if (outerListIndent !== 0 && depth > outerListDepth) {
        while (
          listItems.length > 0 &&
          outerListDepth === listItems[listItems.length - 1]!.depth &&
          indent < listItems[listItems.length - 1]!.content
        )
          listItems.pop();
        listItems.push({
          content: outerListIndent,
          depth: outerListDepth,
          footnote: false,
        });
      }
      const footnote = isFootnoteDef(text, i, lineEnd);
      const bareMarker = bareMarkerWidth(text, i, lineEnd);
      if (
        blockItemIndent !== 0 ||
        (outerListIndent !== 0 && depth === outerListDepth) ||
        bareMarker !== 0 ||
        footnote
      ) {
        while (
          listItems.length > 0 &&
          depth === listItems[listItems.length - 1]!.depth &&
          indent < listItems[listItems.length - 1]!.content
        )
          listItems.pop();
        listItems.push({
          content: footnote
            ? 4
            : blockStart !== i
              ? blockItemIndent || outerListIndent
              : indent + bareMarker + 1,
          depth,
          footnote,
        });
      }
    }

    const itemIndent =
      blockItemIndent ||
      (depth === lastQuoteDepth && indent >= paragraphItemIndent
        ? paragraphItemIndent
        : 0);
    const mathFence = blockFirst === DOLLAR;
    if (blockFirst === BACKTICK || blockFirst === TILDE || mathFence) {
      let end = blockStart;
      while (end < lineEnd && text.charCodeAt(end) === blockFirst) end += 1;
      if (
        end - blockStart >= (mathFence ? 2 : 3) &&
        (blockFirst === TILDE ||
          !includesChar(text, blockFirst, end, lineEnd)) &&
        (!mathFence ||
          (!markersInProse &&
            !indentedMarker &&
            columns(text, contentStart, blockStart) - itemIndent < 4))
      ) {
        fenceChar = blockFirst;
        fenceRun = end - blockStart;
        fenceIndent = mathFence ? itemIndent : blockStart - contentStart;
        fenceQuoteDepth = depth;
      }
    }
    const mathStart = text.startsWith("\\\\[", blockStart)
      ? blockStart + 1
      : blockStart;
    const mathClose = text.startsWith("\\[", mathStart)
      ? "\\]"
      : text.startsWith("[/math]", mathStart)
        ? "[/math]"
        : "";
    if (mathClose !== "") {
      const close = text.indexOf(mathClose, mathStart + mathClose.length);
      if (close !== -1) {
        mathEnd = close + mathClose.length;
        mathQuoteDepth = depth;
        mathItemIndent = itemIndent;
        mathQuoteIndents = blockQuoteIndents;
      }
    }
    let closesBlock = false;
    if (
      blockFirst === LESS_THAN &&
      shallow &&
      !markersInProse &&
      fenceChar === 0
    ) {
      htmlKind = htmlBlockKind(
        text,
        blockStart,
        lineEnd,
        !inParagraph || depth > lastQuoteDepth || blockStart !== i,
      );
      if (htmlKind !== 0) {
        if (
          htmlKind < 6 &&
          htmlBlockEnds(text, htmlKind, blockStart, lineEnd)
        ) {
          ranges.push(lineStart, lineEnd);
          htmlKind = 0;
          closesBlock = true;
        } else {
          htmlStart = lineStart;
          htmlQuoteDepth = depth;
          htmlQuoteIndents = blockQuoteIndents;
          htmlItemIndent = itemIndent;
        }
      }
    }
    const continued: boolean = inParagraph;
    const ruleLine: boolean =
      shallow &&
      (isRuleLine(text, i, lineEnd, continued && depth === lastQuoteDepth) ||
        (blockStart !== i &&
          !markersInProse &&
          isRuleLine(text, listMarkerEnd(text, i, lineEnd), lineEnd, false)));
    inParagraph =
      first !== -1 &&
      fenceChar === 0 &&
      mathEnd <= lineEnd &&
      htmlKind === 0 &&
      !closesBlock &&
      !ruleLine &&
      !(
        shallow && isAtxHeading(text, markersInProse ? i : blockStart, lineEnd)
      );
    if (inParagraph) {
      paragraphItemIndent =
        blockStart !== i && !markersInProse
          ? blockItemIndent
          : continued
            ? paragraphItemIndent
            : 0;
    } else if (
      blockStart === i &&
      first !== -1 &&
      indent < paragraphItemIndent
    ) {
      paragraphItemIndent = 0;
    }
    lastQuoteDepth = depth;
    previousBlank = first === -1;
    previousHeading =
      ruleLine ||
      (shallow && isAtxHeading(text, markersInProse ? i : blockStart, lineEnd));
    previousFenceClose = false;
    lineStart = nextLine;
  }
  if (htmlKind !== 0) ranges.push(htmlStart, text.length);
  if (codeStart !== -1) ranges.push(codeStart, text.length);
  return ranges;
}

function rewriteOutsideBlocks(
  text: string,
  rewrite: (text: string, offset: number) => string,
  original = text,
): string {
  const ranges = htmlBlockRanges(text);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < ranges.length; i += 2) {
    const from = ranges[i]!;
    const to = ranges[i + 1]!;
    out += rewrite(text.slice(cursor, from), cursor) + original.slice(from, to);
    cursor = to;
  }
  return out + rewrite(text.slice(cursor), cursor);
}

const LATEX_INLINE_DELIMITER = /\\{1,2}\(([^\n]+?)\\{1,2}\)/g;
const LATEX_DISPLAY_DELIMITER = /\\{1,2}\[([\s\S]+?)\\{1,2}\]/g;

// A closer has to sit at its opener's blockquote depth, counted in markers so
// `> ~~~` and `>~~~` are the same line, and at most three characters deeper
// than the opener past the last marker, as the remend scan reads it. The
// opener's indentation stands in for a list item's content column, which this
// walker does not track, so a fence written past that column still closes on
// its own line.
const FENCE_CLOSE = {
  "`": /^(`{3,})[ \t\r]*$/,
  "~": /^(~{3,})[ \t\r]*$/,
};
// What may precede a fence opener on its line: the blockquote and list markers
// whose containers a fence opens inside of, nested in either order, and the
// indentation between them. Each marker takes its own trailing whitespace, so a
// prefix that fails cannot be re-split across two markers, and a list marker
// still requires the space that separates it from its content.
const FENCE_OPEN_PREFIX = /^[ \t]*(?:>[ \t]*|(?:[-*+]|\d{1,9}[.)])[ \t]+)*$/;
const QUOTE_PREFIX = /^[ \t>]*/;

function quoteDepth(prefix: string): number {
  let depth = 0;
  for (const char of prefix) if (char === ">") depth += 1;
  return depth;
}

function indentPastQuote(prefix: string): number {
  const marker = prefix.lastIndexOf(">");
  if (marker === -1) return prefix.length;
  return prefix.length - marker - (prefix[marker + 1] === " " ? 2 : 1);
}

/**
 * End index (exclusive) of the fence opened by the `marker` run at `start`,
 * which the caller has verified opens one: the end of the first later line
 * carrying a closing run of at least the same length, or the end of the
 * container when no line does, since an unclosed fence is one still streaming
 * in. A root fence's container is the whole input; a quoted one ends where its
 * blockquote does, on the first line with fewer markers than the opener, a
 * blank line included, because a fence body takes no lazy continuation and a
 * blank line closes a blockquote. The opener's depth counts every marker ahead
 * of its run, since list markers can separate them on that line, while a later
 * line continues a list item by indentation alone, which this walker does not
 * measure, so a fence opened in a list item does not end with it.
 */
function fenceEnd(text: string, start: number, marker: "`" | "~"): number {
  const fenceLength = runLength(text, start, marker);
  const opener = text.slice(text.lastIndexOf("\n", start - 1) + 1, start);
  const depth = quoteDepth(opener);
  const indent = indentPastQuote(opener);
  let lineStart = text.indexOf("\n", start);

  while (lineStart !== -1) {
    const lineEnd = text.indexOf("\n", lineStart + 1);
    const line = text.slice(
      lineStart + 1,
      lineEnd === -1 ? undefined : lineEnd,
    );
    const prefix = QUOTE_PREFIX.exec(line)![0];
    const lineDepth = quoteDepth(prefix);
    if (lineDepth < depth) return lineStart;
    if (lineDepth === depth && indentPastQuote(prefix) <= indent + 3) {
      const close = FENCE_CLOSE[marker].exec(line.slice(prefix.length));
      if (close && close[1]!.length >= fenceLength) {
        return lineEnd === -1 ? text.length : lineEnd;
      }
    }
    lineStart = lineEnd;
  }

  return text.length;
}

/**
 * Whether the backtick run at `start` opens a fence rather than a code span: a
 * fence is a flow construct, so its run is three or more backticks carrying
 * nothing but indentation and blockquote markers ahead of them on their line,
 * and an info string, which CommonMark forbids a backtick in.
 *
 * Indentation is not capped at the three columns CommonMark allows, because the
 * cap is relative to the enclosing container and this walker does not track
 * containers: a fence written past a list item's content column, or on its
 * marker line, is ordinary model output, and reading it as a span costs the
 * closer of any such fence whose body carries a blank line. The cost of the
 * wider reading is that a run indented four columns at the root, where
 * CommonMark reads an indented code block, opens a fence here.
 */
function opensBacktickFence(text: string, start: number): boolean {
  const fenceLength = runLength(text, start, "`");
  if (fenceLength < 3) return false;

  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  if (!FENCE_OPEN_PREFIX.test(text.slice(lineStart, start))) return false;

  const lineEnd = text.indexOf("\n", start + fenceLength);
  const info = text.slice(
    start + fenceLength,
    lineEnd === -1 ? undefined : lineEnd,
  );
  return !info.includes("`");
}

/**
 * Whether the tilde run at `index` opens a fence. A tilde run only ever opens
 * one, so unlike a backtick run it needs no info string rule, but it still has
 * to carry the same container prefix as a backtick fence.
 */
function opensTildeFence(text: string, index: number): boolean {
  if (text[index] !== "~" || runLength(text, index, "~") < 3) return false;
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  return FENCE_OPEN_PREFIX.test(text.slice(lineStart, index));
}

/**
 * End index (exclusive) of the backtick construct opened at `start`: the fence
 * when {@link opensBacktickFence} accepts the run, the code span otherwise, or
 * -1 when a span never closes.
 */
function backtickEnd(text: string, start: number): number {
  return opensBacktickFence(text, start)
    ? fenceEnd(text, start, "`")
    : codeSpanEnd(text, start);
}

/**
 * Applies `rewrite` to the stretches of `text` outside HTML blocks, indented code, code spans and fences,
 * copying their contents through verbatim, so a delimiter shown as code is never
 * rewritten. `\x` escapes are stepped over when scanning so an escaped
 * backtick does not open a span, and a delimiter pair straddling a code
 * boundary stays as written. Each stretch is passed the characters adjacent to
 * it so the rewrite can make line-boundary decisions that survive the split.
 *
 * Backtick regions are found with `backtickEnd`, which {@link
 * escapeCurrencyDollars} also uses, and split the two constructs a backtick run
 * opens in CommonMark: a run of three or more starting a line opens a fence,
 * which closes on a line carrying only an at-least-as-long run, and a run
 * anywhere else opens a code span, which closes on a run of exactly its own
 * length wherever on a line that run sits, and never past the paragraph it
 * opens in. An unclosed span reads as literal text, while an unclosed fence is
 * one still streaming in and protects to the end of its container. Tilde runs
 * only ever open a fence, read the same way.
 */
function rewriteOutsideCode(
  text: string,
  rewrite: (
    segment: string,
    precededBy: string,
    followedBy: string,
    lineHead: (offset: number) => string,
  ) => string,
): string {
  return rewriteOutsideBlocks(text, (text) => {
    let out = "";
    let index = 0;
    let plainStart = 0;

    const flush = (end: number, followedBy: string) => {
      const segment = text.slice(plainStart, end);
      if (segment === "") return;
      const start = plainStart;
      // A segment begins after any code span, so the line it sits on can start
      // earlier than the segment does and only the original text has it.
      const lineHead = (offset: number) => {
        const at = start + offset;
        return text.slice(text.lastIndexOf("\n", at - 1) + 1, at);
      };
      out += rewrite(segment, out.slice(-1), followedBy, lineHead);
    };

    const copyVerbatim = (to: number) => {
      flush(index, text[index]!);
      out += text.slice(index, to);
      index = to;
      plainStart = to;
    };

    while (index < text.length) {
      const char = text[index];
      if (char === "\\") {
        index += 2;
      } else if (char === "`") {
        const end = backtickEnd(text, index);
        if (end !== -1) copyVerbatim(end);
        else index += runLength(text, index, "`");
      } else if (opensTildeFence(text, index)) {
        copyVerbatim(fenceEnd(text, index, "~"));
      } else {
        index += 1;
      }
    }
    flush(text.length, "");

    return out;
  });
}

/**
 * Emits a display-math body in the `$$` form remark-math parses: `$$body$$` on
 * one span for a single-line body, and for a body spanning lines the fenced
 * form, on lines the `$$` markers own. remark-math parses multiline `$$` as a
 * flow construct: the opening marker has to start a line and the closing marker
 * to end one, and it reads whatever else shares those lines as fence metadata
 * rather than as math.
 *
 * A delimiter pair wrapping nothing is left as written: `$$$$` would itself
 * open a fence that never closes.
 */
const LINE_PREFIX = /^(?:[ \t]*(?:>[ \t]*)*)(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?/;

/**
 * The prefix a following line needs to stay inside the block the match opened
 * in: a blockquote marker repeats, a list marker becomes the spaces its content
 * is indented by, and a plain indent is copied.
 */
function continuationPrefix(lineHead: string): string {
  return (LINE_PREFIX.exec(lineHead)?.[0] ?? "").replace(/[^>\t]/g, " ");
}

function emitDisplayMath(
  match: string,
  body: string,
  offset: number,
  source: string,
  precededBy: string,
  followedBy: string,
  lineHead: (offset: number) => string,
): string {
  const trimmed = body.trim();
  if (trimmed === "") return match;
  if (!trimmed.includes("\n")) return `$$${trimmed}$$`;

  const before = offset === 0 ? precededBy : source[offset - 1]!;
  const afterStart = offset + match.length;
  const after = afterStart === source.length ? followedBy : source[afterStart]!;
  // A CRLF document puts the carriage return next to the match, so both endings
  // count as already being at a line boundary.
  const endsLine = (char: string) =>
    char === "" || char === "\n" || char === "\r";
  const lead = endsLine(before) ? "" : "\n";
  const tail = endsLine(after) ? "" : "\n";

  // Markers written at the root column would end the list item or blockquote the
  // math was written inside, so they carry that container's prefix and the body
  // is aligned to it.
  const prefix = continuationPrefix(lineHead(offset));
  const depth = quoteDepth(prefix);
  // The body is split before trimming, since trimming would take the shared
  // indentation off the first line only and leave the block ragged.
  const bodyLines = body.split("\n");
  while (bodyLines.length > 0 && bodyLines[0]!.trim() === "") bodyLines.shift();
  while (bodyLines.length > 0 && bodyLines.at(-1)!.trim() === "") {
    bodyLines.pop();
  }
  // Only the indentation the whole body shares is replaced by the container
  // prefix, so an aligned block keeps its relative indentation.
  const shared = bodyLines.reduce(
    (least, line) =>
      line.trim() === ""
        ? least
        : Math.min(least, /^[ \t]*/.exec(line)![0].length),
    Number.POSITIVE_INFINITY,
  );
  const lines = bodyLines.map((line) => {
    // A line already carrying the blockquote markers keeps the spacing it was
    // written with; `>a` and `> a` are the same blockquote. Indentation alone
    // is not that signal, since a body may legitimately be indented, and a line
    // with fewer markers is a lazy continuation whose markers the prefix
    // replaces.
    const markers = QUOTE_PREFIX.exec(line)![0];
    const lineDepth = quoteDepth(markers);
    if (depth > 0 && lineDepth > 0) {
      return lineDepth >= depth
        ? line
        : `${prefix}${line.slice(markers.length)}`;
    }
    return `${prefix}${line.slice(Number.isFinite(shared) ? shared : 0)}`;
  });

  return `${lead}${prefix}$$\n${lines.join("\n")}\n${prefix}$$${tail}`;
}

/**
 * Rewrites LaTeX bracket delimiters to dollar delimiters: `\(...\)` becomes
 * `$...$` (inline) and `\[...\]` becomes `$$...$$` (display, fenced when the
 * body spans lines — see {@link emitDisplayMath}). A single or double leading
 * backslash is accepted, since models emit both depending on escaping.
 * remark-math only recognizes the dollar form, so without this rewrite bracket
 * math renders as plain text.
 */
export function rewriteLatexBracketDelimiters(text: string): string {
  // The display rewrite runs first: its offsets index the segment as the walker
  // cut it, and an inline rewrite ahead of it would shift them off the line
  // whose prefix the fence copies.
  return rewriteOutsideCode(text, (segment, precededBy, followedBy, lineHead) =>
    segment
      .replace(
        LATEX_DISPLAY_DELIMITER,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(
            match,
            body,
            offset,
            source,
            precededBy,
            followedBy,
            lineHead,
          ),
      )
      .replace(LATEX_INLINE_DELIMITER, (match: string, body: string) => {
        const trimmed = body.trim();
        return trimmed === "" ? match : `$${trimmed}$`;
      }),
  );
}

const MATH_TAG = /\[\/math\]([\s\S]*?)\[\/math\]/g;
const INLINE_TAG = /\[\/inline\]([\s\S]*?)\[\/inline\]/g;

/**
 * Rewrites the custom math tags some models emit to dollar delimiters:
 * `[/math]...[/math]` becomes `$$...$$` (fenced when the body spans lines — see
 * {@link emitDisplayMath}) and `[/inline]...[/inline]` becomes `$...$`.
 */
export function rewriteCustomMathTags(text: string): string {
  return rewriteOutsideCode(text, (segment, precededBy, followedBy, lineHead) =>
    segment
      .replace(
        MATH_TAG,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(
            match,
            body,
            offset,
            source,
            precededBy,
            followedBy,
            lineHead,
          ),
      )
      .replace(INLINE_TAG, (match: string, body: string) => {
        const trimmed = body.trim();
        return trimmed === "" ? match : `$${trimmed}$`;
      }),
  );
}

/**
 * Normalizes the alternative math delimiters language models commonly emit (LaTeX
 * `\(...\)` / `\[...\]` brackets and `[/math]` / `[/inline]` tags) to the `$...$` /
 * `$$...$$` delimiters remark-math parses. Pass it to the `preprocess` prop of
 * `MarkdownTextPrimitive` or `StreamdownTextPrimitive`.
 *
 * It does not touch currency. Compose it with {@link escapeCurrencyDollars} when
 * single-dollar math is enabled and your content includes prices.
 */
export function normalizeMathDelimiters(text: string): string {
  return rewriteLatexBracketDelimiters(rewriteCustomMathTags(text));
}

const LATEX_SYNTAX = /\\[a-zA-Z]|[_^{}]/;
const BLANK_LINE = /\n[ \t]*\n/;
const ADJACENT_WORDS = /[A-Za-z]{3,}\s+[A-Za-z]{3,}/;
const TRAILING_OPERATOR = /[-+*/=<>,;:([\u2013\u2014\u2212]$/;

// The paragraph break a code span cannot reach past. `BLANK_LINE` cannot serve
// here: it does not admit the carriage return of a CRLF document, and widening
// it would change which bodies `isMathBody` accepts. Sticky so the scan starts
// at the run without copying the rest of the input on every backtick.
const PARAGRAPH_BREAK = /\n[ \t\r]*\n/g;

/** Length of the run of `char` starting at `start`. */
function runLength(text: string, start: number, char: string): number {
  let length = 0;
  while (text[start + length] === char) length++;
  return length;
}

/**
 * End index (exclusive) of the code span whose backtick run starts at `start`,
 * or -1 when that run is never closed and its backticks read as literal text. A
 * span closes on a run of exactly its own length, wherever on a line that run
 * sits; a shorter or longer run is content, and a blank line ends the search
 * with the paragraph.
 */
function codeSpanEnd(text: string, start: number): number {
  const delimiterLength = runLength(text, start, "`");
  const delimiter = "`".repeat(delimiterLength);
  // A span is an inline construct, so it cannot reach past the paragraph it
  // opens in and a run left open in prose does not swallow a later fence.
  PARAGRAPH_BREAK.lastIndex = start;
  const blank = PARAGRAPH_BREAK.exec(text);
  const limit = blank ? blank.index : text.length;
  let closed = text.indexOf(delimiter, start + delimiterLength);

  while (closed !== -1 && closed < limit) {
    const closedLength = runLength(text, closed, "`");
    if (closedLength === delimiterLength) break;
    closed = text.indexOf(delimiter, closed + closedLength);
  }

  return closed === -1 || closed >= limit ? -1 : closed + delimiterLength;
}

/**
 * Index of the `$` that would close an inline math span opened at `openIndex`, or
 * -1 when none does. Escapes and code spans are stepped over so that a `$` inside
 * them is not mistaken for the closing delimiter.
 */
function findClosingDollar(text: string, openIndex: number): number {
  let index = openIndex + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "$") return index;
    if (char === "\\") index += 2;
    else if (char === "`") {
      const end = backtickEnd(text, index);
      index = end === -1 ? index + runLength(text, index, "`") : end;
    } else index += 1;
  }
  return -1;
}

/**
 * Prose separating two currency amounts always ends on a space (`5 and ` in
 * `$5 and $7`), whereas math is never written `$x $`.
 */
function endsMidSentence(body: string): boolean {
  return /\s$/.test(body) && !/^\s/.test(body);
}

/**
 * A currency range leaves a dangling operator (`5-` in `$5-$10`), which no inline
 * expression ends on.
 */
function endsOnOperator(body: string): boolean {
  return TRAILING_OPERATOR.test(body);
}

/**
 * Whether the text between two single `$` reads as an inline math expression rather
 * than the text separating two currency amounts. A body that ends the way prose
 * between two amounts does (mid-sentence space, dangling operator) is rejected even
 * when it carries LaTeX syntax, since that prose may itself contain `_` or `\word`;
 * otherwise LaTeX syntax accepts the span and two adjacent words reject it.
 */
function isMathBody(body: string): boolean {
  if (body.length === 0) return false;
  if (BLANK_LINE.test(body)) return false;
  if (endsMidSentence(body) || endsOnOperator(body)) return false;
  if (LATEX_SYNTAX.test(body)) return true;
  return !ADJACENT_WORDS.test(body);
}

/** Whether the `$` at `index` opens a currency amount such as `$5` or `$1,299`. */
function opensCurrencyAmount(text: string, index: number): boolean {
  return /\d/.test(text[index + 1] ?? "");
}

/**
 * The width of the bare list marker on the line `[from, to)` (`-` or `1.`
 * alone), or 0 when anything else is on it: an empty list item whose content
 * follows on later lines, one column past the marker. `listMarkerEnd`
 * requires a trailing space, so this covers the end-of-line case it misses.
 */
function bareMarkerWidth(text: string, from: number, to: number): number {
  let end = to;
  while (end > from) {
    const code = text.charCodeAt(end - 1);
    if (code !== SPACE && code !== TAB && code !== CR) break;
    end -= 1;
  }
  const rest = text.slice(from, end);
  return /^([-*+]|\d{1,9}[.)])$/.test(rest) ? rest.length : 0;
}

/**
 * Whether `[from, to)` starts a GFM footnote definition (`[^label]:`).
 * Indented content under a footnote definition is footnote prose, not an
 * indented code block.
 */
function isFootnoteDef(text: string, from: number, to: number): boolean {
  if (
    from + 3 >= to ||
    text.charCodeAt(from) !== LBRACKET ||
    text.charCodeAt(from + 1) !== CARET
  ) {
    return false;
  }
  let i = from + 2;
  const labelStart = i;
  while (i < to && text.charCodeAt(i) !== RBRACKET) i += 1;
  if (i === labelStart || i >= to) return false;
  return text.charCodeAt(i + 1) === COLON;
}

/**
 * End index (exclusive) of the run at `index` that must be copied unchanged: a `\x`
 * escape, a code span or fence, a `$$` display delimiter, an inline math span, or a
 * plain character. Returns `index` itself for a single `$`, which the caller has to
 * decide.
 */
function endOfVerbatimRun(text: string, index: number): number {
  const char = text[index];
  if (char === "\\") return Math.min(index + 2, text.length);
  if (char === "`") {
    const end = backtickEnd(text, index);
    return end === -1 ? index + runLength(text, index, "`") : end;
  }
  if (opensTildeFence(text, index)) return fenceEnd(text, index, "~");
  if (char !== "$") return index + 1;

  const dollars = runLength(text, index, "$");
  if (dollars >= 2) return index + dollars;

  const close = findClosingDollar(text, index);
  const opensMath =
    close !== -1 &&
    !opensCurrencyAmount(text, close) &&
    isMathBody(text.slice(index + 1, close));
  return opensMath ? close + 1 : index;
}

/**
 * Escapes a `$` that opens a currency amount (`$5`, `$19.99`, `$1,299`) so that
 * remark-math with single-dollar math enabled does not consume prices in prose as
 * math delimiters. The `$$` of display math is left intact, an already-escaped `\$`
 * is not escaped twice, and HTML blocks, indented code, code spans and fences are never rewritten.
 *
 * A `$` followed by a digit is only currency when it does not open a plausible math
 * span, so the text up to the next `$` is inspected first: `$0$` and `$5x = 10$`
 * survive, while `$5 and $7` is escaped as before. Deciding on the delimiter pair
 * rather than on the digit alone is what keeps a wrong guess local: an accepted span
 * contains no `$`, so an inserted escape can never fall between a delimiter pair and
 * shift every delimiter that follows it.
 */
export function escapeCurrencyDollars(text: string): string {
  const normalized = text.replace(/\r(?!\n)/g, "\n");
  return rewriteOutsideBlocks(
    normalized,
    (slice, offset) => {
      let out = "";
      let index = 0;

      while (index < slice.length) {
        const verbatimEnd = endOfVerbatimRun(slice, index);
        if (verbatimEnd > index) {
          out += text.slice(offset + index, offset + verbatimEnd);
          index = verbatimEnd;
          continue;
        }
        out += opensCurrencyAmount(slice, index) ? "\\$" : "$";
        index += 1;
      }

      return out;
    },
    text,
  );
}
