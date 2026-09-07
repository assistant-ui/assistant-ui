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

const SINGLE_TILDE = /([\p{L}\p{N}_])~(?!~)(?=[\p{L}\p{N}_])/gu;
const COMPARISON_OPERATOR = /^(\s*(?:[-*+]|\d+[.)]) +)(>)(=?\s*[$]?\d)/gm;

function markRange(lookup: Uint8Array, from: number, to: number): void {
  lookup.fill(1, from, to);
}

function markBlockRegions(text: string, lookup: Uint8Array): void {
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;

  for (let lineStart = 0; lineStart <= text.length;) {
    let lineEnd = text.indexOf("\n", lineStart);
    if (lineEnd === -1) lineEnd = text.length;

    let first = lineStart;
    while (first < lineEnd && isSpace(text.charCodeAt(first))) first += 1;

    let run = first;
    while (
      run < lineEnd &&
      (text.charCodeAt(run) === BACKTICK || text.charCodeAt(run) === TILDE) &&
      text.charCodeAt(run) === text.charCodeAt(first)
    ) {
      run += 1;
    }
    const marker =
      first < lineEnd && first - lineStart <= 3 && run - first >= 3;

    if (inFence) {
      markRange(lookup, lineStart, lineEnd);
      if (
        marker &&
        text.charCodeAt(first) === fenceChar &&
        run - first >= fenceRun &&
        onlyWhitespace(text, run, lineEnd)
      ) {
        inFence = false;
      }
    } else if (marker) {
      markRange(lookup, lineStart, lineEnd);
      inFence = true;
      fenceChar = text.charCodeAt(first);
      fenceRun = run - first;
    } else if (first - lineStart >= 4 || text.charCodeAt(lineStart) === TAB) {
      markRange(lookup, lineStart, lineEnd);
    }

    lineStart = lineEnd + 1;
  }
}

function markDelimitedRegions(text: string, lookup: Uint8Array): void {
  for (let i = 0; i < text.length; i += 1) {
    if (lookup[i]) continue;

    const char = text.charCodeAt(i);
    if (char === BACKSLASH) {
      const next = text.charCodeAt(i + 1);
      if (next === 40 || next === 91) {
        const close = next === 40 ? "\\)" : "\\]";
        const end = text.indexOf(close, i + 2);
        markRange(lookup, i, end === -1 ? text.length : end + 2);
        i = end === -1 ? text.length : end + 1;
      } else {
        i += 1;
      }
      continue;
    }

    if (char !== BACKTICK && char !== 36) continue;

    let run = i + 1;
    while (run < text.length && text.charCodeAt(run) === char) run += 1;
    const delimiterLength = char === 36 ? Math.min(run - i, 2) : run - i;
    let close = -1;

    for (let candidate = run; candidate < text.length; candidate += 1) {
      if (text.charCodeAt(candidate) === BACKSLASH) {
        candidate += 1;
        continue;
      }
      if (text.charCodeAt(candidate) !== char) continue;
      let end = candidate + 1;
      while (end < text.length && text.charCodeAt(end) === char) end += 1;
      if (
        (char === 36 && end - candidate >= delimiterLength) ||
        (char === BACKTICK && end - candidate === delimiterLength)
      ) {
        close = end;
        break;
      }
      candidate = end - 1;
    }

    markRange(lookup, i, close === -1 ? text.length : close);
    i = close === -1 ? text.length : close - 1;
  }
}

function protectedRegions(text: string): Uint8Array {
  const lookup = new Uint8Array(text.length);
  markBlockRegions(text, lookup);
  markDelimitedRegions(text, lookup);
  return lookup;
}

function escapePositionIndependentSyntax(
  text: string,
  options?: RemendOptions,
): string {
  let escaped = text;

  if (options?.singleTilde !== false) {
    const lookup = protectedRegions(escaped);
    escaped = escaped.replace(
      SINGLE_TILDE,
      (match, word: string, offset: number) =>
        lookup[offset + word.length] ? match : `${word}\\~`,
    );
  }

  if (options?.comparisonOperators !== false) {
    const lookup = protectedRegions(escaped);
    escaped = escaped.replace(
      COMPARISON_OPERATOR,
      (
        match,
        prefix: string,
        operator: string,
        rest: string,
        offset: number,
      ) =>
        lookup[offset + prefix.length]
          ? match
          : `${prefix}\\${operator}${rest}`,
    );
  }

  return escaped;
}

function remendWithPositionIndependentSyntax(
  text: string,
  options: RemendOptions | undefined,
  completionOptions: RemendOptions = {},
): string {
  const escaped = escapePositionIndependentSyntax(text, options);
  return remend(escaped, {
    ...options,
    ...completionOptions,
    singleTilde: false,
    comparisonOperators: false,
  });
}

/**
 * Repairs incomplete Markdown in the final block and applies position-independent
 * escapes only outside protected Markdown regions. Custom handlers receive the
 * prefix and final block separately.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const start = findRemendWindowStart(text);
  if (start <= 0) {
    return remendWithPositionIndependentSyntax(text, options);
  }

  return (
    remendWithPositionIndependentSyntax(
      text.slice(0, start),
      options,
      COMPLETION_OFF,
    ) + remendWithPositionIndependentSyntax(text.slice(start), options)
  );
}
