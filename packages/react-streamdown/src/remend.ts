import remend, { type RemendOptions } from "remend";

const BACKTICK = 96;
const TILDE = 126;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const BACKSLASH = 92;
const DOLLAR = 36;
const GT = 62;
const ASTERISK = 42;
const PLUS = 43;
const DASH = 45;
const DOT = 46;
const CLOSE_PAREN = 41;

const isSpace = (c: number) => c === SPACE || c === TAB || c === CR;
const isDigit = (c: number) => c >= 48 && c <= 57;

function hasBacktick(text: string, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (text.charCodeAt(i) === BACKTICK) return true;
  }
  return false;
}

function backtickRun(text: string, from: number, to: number): number {
  let end = from;
  while (end < to && text.charCodeAt(end) === BACKTICK) end += 1;
  return end;
}

function closeCodeSpan(
  text: string,
  from: number,
  lineEnd: number,
  length: number,
): number {
  let s = from;
  while (s < lineEnd) {
    if (text.charCodeAt(s) === BACKTICK) {
      const end = backtickRun(text, s, lineEnd);
      if (end - s === length) return end;
      s = end;
    } else {
      s += 1;
    }
  }
  return -1;
}

function isEscaped(text: string, at: number): boolean {
  let backslashes = 0;
  for (let i = at - 1; i >= 0 && text.charCodeAt(i) === BACKSLASH; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function onlyWhitespace(text: string, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (!isSpace(text.charCodeAt(i))) return false;
  }
  return true;
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

type BlockScan = {
  boundary: number;
  protectedRanges: number[];
  openStart: number;
  openMath: boolean;
};

/**
 * `boundary` is the start of the last block outside open code fences and `$$` math, `protectedRanges` holds the closed fences and `$$` blocks as flat start/end pairs, and `openStart` is the start of the fence or `$$` block still open at the end, or -1. A range starts at a line start because remend drops a trailing space from its input, so a cut inside a line would lose one.
 *
 * A fence opens at any indentation, since a marker indented four or more columns is either a fence nested in a list item or an indented code block. It closes on a marker in its own blockquote container, as `fenceEnd` in preprocess reads them, and unlike there only when the closer is indented at most three characters past the opener, counting a tab as one, so a deeper marker stays body as CommonMark reads it. A fence or `$$` block also opens after the list markers of its line, and then ends with that list item at the first line indented fewer columns than the item's content, with a tab stop every four columns as CommonMark sets them. Backtick spans stay within their paragraph, so a `$$` inside inline code never toggles math. A bare `>` line is blank inside a blockquote but opens a new block after a blank line.
 */
function scanBlocks(text: string): BlockScan {
  const n = text.length;
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;
  let fenceStart = 0;
  let fenceIndent = 0;
  let fenceQuoted = false;
  let inMath = false;
  let mathStart = -1;
  let itemIndent = 0;
  let spanRun = 0;
  let boundary = 0;
  let pending = -1;
  const protectedRanges: number[] = [];

  for (let lineStart = 0; lineStart <= n;) {
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = n;

    let i = lineStart;
    let quoted = false;
    let contentStart = lineStart;
    while (i < lineEnd) {
      const c = text.charCodeAt(i);
      if (c === GT) {
        quoted = true;
        contentStart = text.charCodeAt(i + 1) === SPACE ? i + 2 : i + 1;
      } else if (!isSpace(c)) {
        break;
      }
      i += 1;
    }

    const first = i < lineEnd ? text.charCodeAt(i) : -1;
    let marker = false;

    if (inFence && fenceQuoted && !quoted && first !== -1) {
      inFence = false;
      if (!inMath) {
        protectedRanges.push(fenceStart, lineStart - 1);
        boundary = lineStart;
        pending = -1;
      }
    }

    if (
      (inFence || inMath) &&
      itemIndent !== 0 &&
      first !== -1 &&
      columns(text, contentStart, i) < itemIndent
    ) {
      protectedRanges.push(inMath ? mathStart : fenceStart, lineStart - 1);
      inFence = false;
      inMath = false;
      boundary = lineStart;
      pending = -1;
    }

    const blockStart =
      inFence || inMath ? i : skipListMarkers(text, i, lineEnd);
    const blockItemIndent =
      blockStart === i ? 0 : columns(text, contentStart, blockStart);
    const blockFirst = blockStart < lineEnd ? text.charCodeAt(blockStart) : -1;

    if (blockFirst === BACKTICK || blockFirst === TILDE) {
      let run = blockStart;
      while (run < lineEnd && text.charCodeAt(run) === blockFirst) run += 1;
      if (
        run - blockStart >= 3 &&
        (inFence || blockFirst === TILDE || !hasBacktick(text, run, lineEnd))
      ) {
        marker = true;
        spanRun = 0;
        if (!inFence) {
          inFence = true;
          fenceChar = blockFirst;
          fenceRun = run - blockStart;
          fenceStart = lineStart;
          fenceIndent = blockStart - contentStart;
          fenceQuoted = quoted;
          if (!inMath) itemIndent = blockItemIndent;
        } else if (
          blockFirst === fenceChar &&
          quoted === fenceQuoted &&
          blockStart - contentStart <= fenceIndent + 3 &&
          run - blockStart >= fenceRun &&
          onlyWhitespace(text, run, lineEnd)
        ) {
          inFence = false;
          if (!inMath) protectedRanges.push(fenceStart, lineEnd);
        }
      }
    }

    if (!inFence && !marker) {
      let s = lineStart;
      if (spanRun !== 0) {
        if (
          first === -1 ||
          (blockFirst === DOLLAR && text.charCodeAt(blockStart + 1) === DOLLAR)
        ) {
          spanRun = 0;
        } else {
          const end = closeCodeSpan(text, lineStart, lineEnd, spanRun);
          if (end === -1) {
            s = lineEnd;
          } else {
            s = end;
            spanRun = 0;
          }
        }
      }
      while (s < lineEnd - 1) {
        const c = text.charCodeAt(s);
        if (c === BACKTICK && !inMath && !isEscaped(text, s)) {
          const open = backtickRun(text, s, lineEnd);
          const end = closeCodeSpan(text, open, lineEnd, open - s);
          if (end === -1) {
            spanRun = open - s;
            s = lineEnd;
          } else {
            s = end;
          }
        } else if (c === DOLLAR && text.charCodeAt(s + 1) === DOLLAR) {
          if (!isEscaped(text, s)) {
            if (inMath) {
              if (mathStart !== -1) protectedRanges.push(mathStart, s + 2);
            } else {
              mathStart = s === blockStart ? lineStart : -1;
              itemIndent = mathStart === -1 ? 0 : blockItemIndent;
            }
            inMath = !inMath;
          }
          s += 2;
        } else {
          s += 1;
        }
      }
    }

    if (first === -1 && !inFence && !inMath && !(quoted && pending !== -1)) {
      pending = lineEnd + 1;
    } else if (pending !== -1) {
      boundary = pending;
      pending = -1;
    }

    if (!inFence && !inMath) itemIndent = 0;
    lineStart = lineEnd + 1;
  }

  const openMath = inMath && mathStart !== -1;
  const openStart = openMath ? mathStart : inFence && !inMath ? fenceStart : -1;
  return { boundary, protectedRanges, openStart, openMath };
}

/**
 * Returns the start of the last block outside open code fences and `$$` math.
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
 * spans but not `~~~` fences or math, so remend only ever receives the text
 * between the fences and `$$` blocks the scan found.
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
 * Repairs incomplete Markdown in the final block, cut down to the prose after its last fence or `$$` block, and applies text escapes to every earlier run of prose. Closed fences and `$$` blocks are copied raw, an open fence is copied raw to the end, and an open `$$` block receives nothing but the `katex` completion. The prose before a block has settled: remend cannot see `~~~` fences or math, so completing it would append the closer after the block, and a paragraph a block interrupted renders as written. Custom handlers receive each run of prose as a separate call.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const { boundary, protectedRanges, openStart, openMath } = scanBlocks(text);
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
    if (!openMath) return out + tail;
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
