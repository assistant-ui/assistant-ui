import remend, { type RemendOptions } from "remend";

const BACKTICK = 96;
const TILDE = 126;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const BACKSLASH = 92;

const isSpace = (c: number) => c === SPACE || c === TAB || c === CR;

function onlyWhitespace(text: string, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (!isSpace(text.charCodeAt(i))) return false;
  }
  return true;
}

/**
 * Returns the start of the last block outside open code fences and `$$` math.
 * Completion can use this boundary, but escapes must also reach earlier text.
 */
export function findRemendWindowStart(text: string): number {
  const n = text.length;
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;
  let inMath = false;
  let boundary = 0;
  let pending = -1;

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
      if (run - i >= 3) {
        marker = true;
        if (!inFence) {
          inFence = true;
          fenceChar = first;
          fenceRun = run - i;
        } else if (
          first === fenceChar &&
          run - i >= fenceRun &&
          onlyWhitespace(text, run, lineEnd)
        ) {
          inFence = false;
        }
      }
    }

    if (!inFence && !marker) {
      for (
        let s = text.indexOf("$$", lineStart);
        s !== -1 && s < lineEnd - 1;
        s = text.indexOf("$$", s + 2)
      ) {
        if (s === 0 || text.charCodeAt(s - 1) !== BACKSLASH) inMath = !inMath;
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

  return boundary;
}

/**
 * Options remend applies to text anywhere in the message rather than to an
 * incomplete construct at its end, plus `linkMode`, which only configures the
 * disabled `links` handler. Every other option completes a dangling opener,
 * which mutates or deletes a block that has already settled, so the prefix pass
 * disables all of them. The two escapes skip backtick fences and inline spans
 * but not `~~~` fences, indented code, or math.
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
 * earlier blocks. Custom handlers receive the prefix and final block separately.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const start = findRemendWindowStart(text);
  if (start <= 0) return remend(text, options);

  return (
    remend(text.slice(0, start), { ...options, ...COMPLETION_OFF }) +
    remend(text.slice(start), options)
  );
}
