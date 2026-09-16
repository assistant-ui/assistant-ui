import remend, { type RemendOptions } from "remend";

const BACKTICK = 96;
const TILDE = 126;
const SPACE = 32;
const TAB = 9;
const CR = 13;
const BACKSLASH = 92;
const DOLLAR = 36;
const GT = 62;

const isSpace = (c: number) => c === SPACE || c === TAB || c === CR;

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

function indentationColumns(text: string, from: number, to: number): number {
  let columns = 0;
  for (let i = from; i < to; i += 1) {
    if (text.charCodeAt(i) === TAB) columns += 4 - (columns % 4);
    else columns += 1;
  }
  return columns;
}

function listMarkerWidth(text: string, from: number, to: number): number {
  const first = text.charCodeAt(from);
  if (
    (first === 42 || first === 43 || first === 45) &&
    (from + 1 === to || isSpace(text.charCodeAt(from + 1)))
  ) {
    return 2;
  }

  let cursor = from;
  while (
    cursor < to &&
    text.charCodeAt(cursor) >= 48 &&
    text.charCodeAt(cursor) <= 57
  ) {
    cursor += 1;
  }
  if (
    cursor > from &&
    (text.charCodeAt(cursor) === 41 || text.charCodeAt(cursor) === 46) &&
    (cursor + 1 === to || isSpace(text.charCodeAt(cursor + 1)))
  ) {
    return cursor + 2 - from;
  }
  return 0;
}

function findInlineMathClose(
  text: string,
  from: number,
  lineEnd: number,
): number {
  let cursor = from;
  while (cursor < lineEnd - 1) {
    if (text.charCodeAt(cursor) === BACKTICK && !isEscaped(text, cursor)) {
      const open = backtickRun(text, cursor, lineEnd);
      const close = closeCodeSpan(text, open, lineEnd, open - cursor);
      if (close === -1) return -1;
      cursor = close;
      continue;
    }
    if (
      text.charCodeAt(cursor) === DOLLAR &&
      text.charCodeAt(cursor + 1) === DOLLAR &&
      !isEscaped(text, cursor)
    ) {
      return cursor;
    }
    cursor += 1;
  }
  return -1;
}

type BlockScan = {
  boundary: number;
  protectedRanges: number[];
};

type ListContainer = {
  contentColumn: number;
  quoted: boolean;
};

// Active nested containers have one quote state and strictly increasing
// content columns because a marker is pushed only inside its active parent.
function findListContainerIndex(
  containers: readonly ListContainer[],
  quoted: boolean,
  indentColumns: number,
) {
  if (containers.length === 0 || containers[0]!.quoted !== quoted) return -1;

  let low = 0;
  let high = containers.length - 1;
  let result = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (containers[middle]!.contentColumn <= indentColumns) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

/**
 * `boundary` is the start of the last block outside open code fences and `$$` math, and `protectedRanges` holds the closed fences and `$$` blocks as flat start/end pairs. A range starts at a line start because remend drops a trailing space from its input, so a cut inside a line would lose one.
 *
 * Fences close only on a marker in their own blockquote container, as `fenceEnd` in preprocess reads them. Backtick spans stay within their paragraph, so a `$$` inside inline code never toggles math. A bare `>` line is blank inside a blockquote but opens a new block after a blank line.
 */
function scanBlocks(text: string): BlockScan {
  const n = text.length;
  let inFence = false;
  let fenceChar = 0;
  let fenceRun = 0;
  let fenceStart = 0;
  let fenceQuoted = false;
  let inMath = false;
  let mathStart = -1;
  let inIndentedCode = false;
  let indentedCodeStart = -1;
  let indentedCodeEnd = -1;
  let spanRun = 0;
  let boundary = 0;
  let pending = -1;
  const listContainers: ListContainer[] = [];
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
    const indentColumns = indentationColumns(text, contentStart, i);
    const listContainerIndex = findListContainerIndex(
      listContainers,
      quoted,
      indentColumns,
    );
    const listContentColumn =
      listContainerIndex === -1
        ? -1
        : listContainers[listContainerIndex]!.contentColumn;
    const inListContainer = listContentColumn !== -1;
    const effectiveIndent = inListContainer
      ? indentColumns - listContentColumn
      : indentColumns;
    const markerWidth = first === -1 ? 0 : listMarkerWidth(text, i, lineEnd);
    let marker = false;

    if (inIndentedCode && first !== -1 && effectiveIndent < 4) {
      protectedRanges.push(indentedCodeStart, indentedCodeEnd);
      inIndentedCode = false;
      indentedCodeStart = -1;
      indentedCodeEnd = -1;
      boundary = lineStart;
    }

    if (inFence && fenceQuoted && !quoted && first !== -1) {
      inFence = false;
      if (!inMath) {
        protectedRanges.push(fenceStart, lineStart - 1);
        boundary = lineStart;
        pending = -1;
      }
    }

    const continuesFence = inFence;

    if (effectiveIndent <= 3 && (first === BACKTICK || first === TILDE)) {
      let run = i;
      while (run < lineEnd && text.charCodeAt(run) === first) run += 1;
      if (
        run - i >= 3 &&
        (inFence || first === TILDE || !hasBacktick(text, run, lineEnd))
      ) {
        marker = true;
        spanRun = 0;
        if (!inFence) {
          inFence = true;
          fenceChar = first;
          fenceRun = run - i;
          fenceStart = lineStart;
          fenceQuoted = quoted;
        } else if (
          first === fenceChar &&
          quoted === fenceQuoted &&
          run - i >= fenceRun &&
          onlyWhitespace(text, run, lineEnd)
        ) {
          inFence = false;
          if (!inMath) protectedRanges.push(fenceStart, lineEnd);
        }
      }
    }

    let indentedCodeLine = false;
    if (!inFence && !marker && !inMath) {
      const startsIndentedCode =
        first !== -1 &&
        effectiveIndent >= 4 &&
        (inIndentedCode || lineStart === 0 || pending !== -1);
      if (startsIndentedCode || (inIndentedCode && first === -1)) {
        indentedCodeLine = true;
        spanRun = 0;
        if (!inIndentedCode) {
          inIndentedCode = true;
          indentedCodeStart = lineStart;
          boundary = lineStart;
        }
        indentedCodeEnd = lineEnd;
        pending = -1;
      } else if (inIndentedCode) {
        protectedRanges.push(indentedCodeStart, indentedCodeEnd);
        inIndentedCode = false;
        indentedCodeStart = -1;
        indentedCodeEnd = -1;
        boundary = lineStart;
      }
    }

    if (!inFence && !marker && !indentedCodeLine) {
      let s = lineStart;
      let spanInterruptedByMath = false;
      if (spanRun !== 0) {
        if (
          first === -1 ||
          (first === DOLLAR && text.charCodeAt(i + 1) === DOLLAR)
        ) {
          spanInterruptedByMath = first === DOLLAR;
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
            const inlineClose = findInlineMathClose(text, s + 2, lineEnd);
            const opensMath = inMath || inlineClose !== -1 || s === i;
            if (!opensMath) {
              s += 2;
              continue;
            }
            if (inMath) {
              if (mathStart !== -1) protectedRanges.push(mathStart, s + 2);
            } else {
              mathStart = s === i && !spanInterruptedByMath ? lineStart : -1;
            }
            inMath = !inMath;
          }
          s += 2;
        } else {
          s += 1;
        }
      }
    }

    if (
      first === -1 &&
      !inFence &&
      !inMath &&
      !indentedCodeLine &&
      !(quoted && pending !== -1)
    ) {
      pending = lineEnd + 1;
    } else if (pending !== -1) {
      boundary = pending;
      pending = -1;
    }

    if (first !== -1 && !continuesFence && !marker) {
      listContainers.length = listContainerIndex + 1;
    }
    if (
      markerWidth !== 0 &&
      !inFence &&
      !inMath &&
      !indentedCodeLine &&
      !marker
    ) {
      listContainers.push({
        contentColumn: indentColumns + markerWidth,
        quoted,
      });
    }

    lineStart = lineEnd + 1;
  }

  if (inIndentedCode) {
    protectedRanges.push(indentedCodeStart, indentedCodeEnd);
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
 * Repairs incomplete Markdown in the final block and applies text escapes to earlier blocks outside closed fences and `$$` blocks. A closed fence or `$$` block that opens the final block is copied raw and only the text after it is repaired. Custom handlers receive the final block and each run of earlier prose between protected blocks as separate calls.
 */
export function tailBoundedRemend(
  text: string,
  options?: RemendOptions,
): string {
  const { boundary: start, protectedRanges } = scanBlocks(text);
  if (protectedRanges.length === 0) {
    if (start <= 0) return remend(text, options);
    return (
      remend(text.slice(0, start), { ...options, ...COMPLETION_OFF }) +
      remend(text.slice(start), options)
    );
  }

  const prefixOptions = { ...options, ...COMPLETION_OFF };
  let out = "";
  let cursor = 0;
  const appendRepaired = (
    from: number,
    to: number,
    repairOptions: RemendOptions,
    beforeProtected: boolean,
  ) => {
    const source = text.slice(from, to);
    const repaired = remend(source, repairOptions);
    if (!beforeProtected) return void (out += repaired);
    let contentEnd = to;
    while (
      contentEnd > from &&
      (text.charCodeAt(contentEnd - 1) === 10 ||
        text.charCodeAt(contentEnd - 1) === CR)
    ) {
      contentEnd -= 1;
    }
    const lineBreak = text.slice(contentEnd, to);
    if (lineBreak === "") return void (out += repaired);
    const lineBreakAt = repaired.lastIndexOf(lineBreak);
    if (
      lineBreakAt !== -1 &&
      lineBreakAt + lineBreak.length < repaired.length
    ) {
      out +=
        repaired.slice(0, lineBreakAt) +
        repaired.slice(lineBreakAt + lineBreak.length) +
        lineBreak;
    } else {
      out += repaired;
    }
  };
  const appendPlain = (from: number, to: number, beforeProtected: boolean) => {
    if (from >= to) return;
    const prefixEnd = Math.min(to, Math.max(from, start));
    if (from < prefixEnd) {
      appendRepaired(
        from,
        prefixEnd,
        prefixOptions,
        beforeProtected && prefixEnd === to,
      );
    }
    if (prefixEnd < to) {
      appendRepaired(prefixEnd, to, options ?? {}, beforeProtected);
    }
  };

  for (let k = 0; k + 1 < protectedRanges.length; k += 2) {
    const from = Math.max(cursor, protectedRanges[k]!);
    const to = Math.max(from, protectedRanges[k + 1]!);
    if (to === cursor) continue;
    appendPlain(cursor, from, true);
    out += text.slice(from, to);
    cursor = to;
  }
  appendPlain(cursor, text.length, false);
  return out;
}
