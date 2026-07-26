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
 * Index of the start of the last top-level block: the character after the most
 * recent blank line that sits outside any open code fence or `$$` math block.
 * An unclosed fence or math span always begins after such a blank, so it stays
 * wholly inside the returned window without separate tracking. One char pass.
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
 * Run incomplete-markdown repair (`remend`) on only the trailing block rather
 * than the whole message. Streamdown splits into blocks after repair and renders
 * each independently, and inline constructs cannot cross a blank line, so a
 * dangling opener can only be in the last block. Repairing just that block is
 * render-equivalent to repairing the full text, but bounds the heavier `remend`
 * repair to the tail instead of running it over the whole message every flush
 * (the cheap boundary scan still runs over the full text).
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const start = findRemendWindowStart(text);
  return start <= 0
    ? remend(text, options)
    : text.slice(0, start) + remend(text.slice(start), options);
}
