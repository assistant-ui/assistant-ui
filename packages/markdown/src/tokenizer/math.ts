import type { MarkdownIt, StateBlock, StateInline } from "markdown-it";

const BACKSLASH = 0x5c;
const DOLLAR = 0x24;
const OPEN_PAREN = 0x28;
const OPEN_BRACKET = 0x5b;

const isSpace = (code: number) =>
  code === 0x20 || code === 0x09 || code === 0x0a || Number.isNaN(code);
const isDigit = (code: number) => code >= 0x30 && code <= 0x39;

const pushInline = (
  state: StateInline,
  value: string,
  markup: string,
  end: number,
  silent: boolean,
) => {
  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.content = value;
    token.markup = markup;
  }
  state.pos = end;
  return true;
};

// A `$` opens only before a non-space and closes only after a non-space that
// no digit follows, so amounts such as `$5 to $10` stay text.
const singleDollarEnd = (src: string, start: number, max: number) => {
  if (isSpace(src.charCodeAt(start + 1))) return -1;
  for (let end = start + 2; end < max; end++) {
    if (src.charCodeAt(end) !== DOLLAR) continue;
    const before = src.charCodeAt(end - 1);
    if (before === BACKSLASH || isSpace(before)) continue;
    if (isDigit(src.charCodeAt(end + 1))) continue;
    return end;
  }
  return -1;
};

// A closer's validity never depends on its opener, so a search that fails from
// one position fails from every later one; remembering that keeps a line full of
// unclosed openers linear.
const missingFrom = new WeakMap<StateInline, Map<string, number>>();

const findCloser = (
  state: StateInline,
  closer: string,
  from: number,
  search: () => number,
) => {
  const missing = missingFrom.get(state) ?? new Map<string, number>();
  missingFrom.set(state, missing);
  if (from >= (missing.get(closer) ?? Infinity)) return -1;
  const end = search();
  if (end === -1 || end >= state.posMax) {
    missing.set(closer, Math.min(from, missing.get(closer) ?? Infinity));
    return -1;
  }
  return end;
};

const mathInline = (state: StateInline, silent: boolean): boolean => {
  const { src, pos: start, posMax: max } = state;
  const code = src.charCodeAt(start);

  if (code === BACKSLASH) {
    const next = src.charCodeAt(start + 1);
    if (next !== OPEN_PAREN && next !== OPEN_BRACKET) return false;
    const closer = next === OPEN_PAREN ? "\\)" : "\\]";
    const end = findCloser(state, closer, start, () =>
      src.indexOf(closer, start + 2),
    );
    if (end === -1 || end + 2 > max || end === start + 2) return false;
    const markup = next === OPEN_PAREN ? "\\(" : "\\[";
    return pushInline(
      state,
      src.slice(start + 2, end),
      markup,
      end + 2,
      silent,
    );
  }

  if (code !== DOLLAR) return false;
  if (src.charCodeAt(start + 1) === DOLLAR) {
    const end = findCloser(state, "$$", start, () =>
      src.indexOf("$$", start + 2),
    );
    if (end === -1 || end + 2 > max || end === start + 2) return false;
    return pushInline(state, src.slice(start + 2, end), "$$", end + 2, silent);
  }
  if (isSpace(src.charCodeAt(start + 1))) return false;
  const end = findCloser(state, "$", start, () =>
    singleDollarEnd(src, start, max),
  );
  if (end === -1) return false;
  return pushInline(state, src.slice(start + 1, end), "$", end + 1, silent);
};

const BLOCK_DELIMITERS = [
  ["$$", "$$"],
  ["\\[", "\\]"],
] as const;

// Like markdown-it's fence rule, an unclosed block runs to the end of its
// container and only a line ending in the closer closes it, so each line's role
// depends on that line alone and a streaming block stays in one piece.
const mathBlock = (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean => {
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  const start = state.bMarks[startLine]! + state.tShift[startLine]!;
  const firstLine = state.src.slice(start, state.eMarks[startLine]);
  const delimiters = BLOCK_DELIMITERS.find(([open]) =>
    firstLine.startsWith(open),
  );
  if (!delimiters) return false;
  const [open, close] = delimiters;
  const rest = firstLine.slice(open.length);

  let content: string;
  let nextLine = startLine + 1;
  const sameLine = rest.indexOf(close);
  if (sameLine !== -1) {
    if (
      rest.slice(sameLine + close.length).trim() ||
      !rest.slice(0, sameLine).trim()
    ) {
      return false;
    }
    if (silent) return true;
    content = rest.slice(0, sameLine);
  } else {
    if (silent) return true;
    let closeLine = -1;
    let closeAt = 0;
    for (; nextLine < endLine; nextLine++) {
      const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!;
      const lineEnd = state.eMarks[nextLine]!;
      if (lineStart < lineEnd && state.sCount[nextLine]! < state.blkIndent) {
        break;
      }
      const line = state.src.slice(lineStart, lineEnd).trimEnd();
      if (line.endsWith(close)) {
        closeLine = nextLine;
        closeAt = lineStart + line.length - close.length;
        break;
      }
    }
    const body = state.getLines(
      startLine + 1,
      closeLine === -1 ? nextLine : closeLine,
      state.sCount[startLine]!,
      true,
    );
    const tail =
      closeLine === -1
        ? ""
        : state.src.slice(
            state.bMarks[closeLine]! + state.tShift[closeLine]!,
            closeAt,
          );
    content = (rest.trim() ? `${rest.trim()}\n` : "") + body + tail;
    if (closeLine !== -1) nextLine = closeLine + 1;
  }

  const token = state.push("math_block", "math", 0);
  token.content = content.replace(/\n+$/, "");
  token.markup = open;
  token.map = [startLine, nextLine];
  token.block = true;
  state.line = nextLine;
  return true;
};

export const mathPlugin = (md: MarkdownIt) => {
  md.inline.ruler.before("escape", "math_inline", mathInline);
  md.block.ruler.before("fence", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
};
