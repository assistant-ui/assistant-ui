import remend, { type RemendOptions } from "remend";

const BACKTICK = 96;
const TILDE = 126;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const BACKSLASH = 92;
const DOLLAR = 36;

const isSpace = (c: number) => c === SPACE || c === TAB || c === CR;

function hasBacktick(text: string, from: number, to: number): boolean {
  const i = text.indexOf("`", from);
  return i !== -1 && i < to;
}

function backtickRun(text: string, from: number, to: number): number {
  let end = from;
  while (end < to && text.charCodeAt(end) === BACKTICK) end += 1;
  return end;
}

function skipCodeSpan(text: string, from: number, lineEnd: number): number {
  const open = backtickRun(text, from, lineEnd);
  const length = open - from;
  for (let s = open; s < lineEnd;) {
    const next = text.indexOf("`", s);
    if (next === -1 || next >= lineEnd) break;
    const end = backtickRun(text, next, lineEnd);
    if (end - next === length) return end;
    s = end;
  }
  return open;
}

function onlyWhitespace(text: string, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (!isSpace(text.charCodeAt(i))) return false;
  }
  return true;
}

type BlockScan = {
  boundary: number;
  protectedRanges: number[];
};

/**
 * Single pass over the message. `boundary` is the start of the last block
 * outside open code fences and `$$` math. `protectedRanges` holds closed
 * fences and closed `$$` blocks as flat start/end pairs. A range always starts
 * at a line start because remend drops a single trailing space from its input,
 * so a cut inside a line would lose the space before the range; that rule also
 * keeps a `$$` inside a backtick span at a line start out of the set. Backtick
 * spans are skipped while scanning a line for `$$`, and a backtick run whose
 * info string holds another backtick is a code span, not a fence opener.
 */
function scanBlocks(text: string): BlockScan {
  const n = text.length;
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;
  let fenceStart = 0;
  let inMath = false;
  let mathStart = -1;
  let boundary = 0;
  let pending = -1;
  const protectedRanges: number[] = [];

  for (let lineStart = 0; lineStart <= n;) {
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = n;

    let i = lineStart;
    while (i < lineEnd && isSpace(text.charCodeAt(i))) i += 1;

    const first = i < lineEnd ? text.charCodeAt(i) : -1;
    let marker = false;

    if ((first === BACKTICK || first === TILDE) && i - lineStart <= 3) {
      let run = i;
      while (run < lineEnd && text.charCodeAt(run) === first) run += 1;
      if (
        run - i >= 3 &&
        (inFence || first === TILDE || !hasBacktick(text, run, lineEnd))
      ) {
        marker = true;
        if (!inFence) {
          inFence = true;
          fenceChar = first;
          fenceRun = run - i;
          fenceStart = lineStart;
        } else if (
          first === fenceChar &&
          run - i >= fenceRun &&
          onlyWhitespace(text, run, lineEnd)
        ) {
          inFence = false;
          if (!inMath) protectedRanges.push(fenceStart, lineEnd);
        }
      }
    }

    if (!inFence && !marker) {
      let s = lineStart;
      while (s < lineEnd - 1) {
        if (text.charCodeAt(s) === BACKTICK) {
          s = skipCodeSpan(text, s, lineEnd);
        } else if (
          text.charCodeAt(s) === DOLLAR &&
          text.charCodeAt(s + 1) === DOLLAR
        ) {
          if (s === 0 || text.charCodeAt(s - 1) !== BACKSLASH) {
            if (inMath) {
              if (mathStart !== -1) protectedRanges.push(mathStart, s + 2);
            } else {
              mathStart = s === i ? lineStart : -1;
            }
            inMath = !inMath;
          }
          s += 2;
        } else {
          s += 1;
        }
      }
    }

    if (first === -1 && !inFence && !inMath) {
      pending = lineEnd + 1;
    } else if (pending !== -1) {
      boundary = pending;
      pending = -1;
    }

    lineStart = lineEnd + 1;
  }

  return { boundary, protectedRanges };
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
 * which mutates or deletes a block that has already settled, so the prefix pass
 * disables all of them. The two escapes skip backtick fences and inline spans
 * but not `~~~` fences or math, so the prefix pass hands remend only the text
 * between the closed fences and `$$` blocks the scan found.
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
 * Repairs incomplete Markdown in the final block and applies text escapes to
 * earlier blocks. A closed fence or `$$` block that opens the final block is
 * copied raw and only the text after it is repaired. Custom handlers receive the final block and each run of
 * earlier prose between protected blocks as separate calls.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const { boundary: start, protectedRanges } = scanBlocks(text);
  if (start <= 0) return remend(text, options);

  const prefixOptions = { ...options, ...COMPLETION_OFF };
  let out = "";
  let cursor = 0;
  let k = 0;
  for (; k + 1 < protectedRanges.length; k += 2) {
    const from = protectedRanges[k]!;
    const to = protectedRanges[k + 1]!;
    if (to > start) break;
    out +=
      remend(text.slice(cursor, from), prefixOptions) + text.slice(from, to);
    cursor = to;
  }

  out += remend(text.slice(cursor, start), prefixOptions);

  if (protectedRanges[k] === start) {
    const to = protectedRanges[k + 1]!;
    return out + text.slice(start, to) + remend(text.slice(to), options);
  }

  return out + remend(text.slice(start), options);
}
