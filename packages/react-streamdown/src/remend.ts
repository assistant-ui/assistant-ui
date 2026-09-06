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
 * Returns a blank-line boundary outside the tracked code fences and `$$` math
 * blocks. This boundary does not limit Markdown repair.
 *
 * @deprecated Use `tailBoundedRemend` with the full message. Transforms and
 * custom handlers can change text before this boundary.
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
 * Repairs incomplete Markdown across the full message. Custom handlers and
 * built-in text transforms can change earlier blocks, not only the last block.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  return remend(text, options);
}
