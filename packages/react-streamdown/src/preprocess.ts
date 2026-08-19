/**
 * Text transforms for the `preprocess` prop of `StreamdownTextPrimitive`.
 *
 * Language models routinely emit math in delimiters that remark-math does not
 * recognize (LaTeX `\(...\)` / `\[...\]` brackets, `[/math]` / `[/inline]` tags),
 * and they write currency amounts (`$5`) that single-dollar math otherwise eats.
 * These helpers normalize that output to the `$...$` / `$$...$$` form remark-math
 * parses, and are streaming safe (each runs on the full accumulated text before
 * the parser sees it). Compose them in `preprocess`.
 */

const LATEX_INLINE_DELIMITER = /\\{1,2}\(([^\n]+?)\\{1,2}\)/g;
const LATEX_DISPLAY_DELIMITER = /\\{1,2}\[([\s\S]+?)\\{1,2}\]/g;

/**
 * Rewrites LaTeX bracket delimiters to dollar delimiters: `\(...\)` becomes
 * `$...$` (inline) and `\[...\]` becomes `$$...$$` (display). A single or double
 * leading backslash is accepted, since models emit both depending on escaping.
 * remark-math only recognizes the dollar form, so without this rewrite bracket
 * math renders as plain text.
 */
export function rewriteLatexBracketDelimiters(text: string): string {
  return text
    .replace(LATEX_INLINE_DELIMITER, (_, body: string) => `$${body.trim()}$`)
    .replace(
      LATEX_DISPLAY_DELIMITER,
      (_, body: string) => `$$${body.trim()}$$`,
    );
}

const MATH_TAG = /\[\/math\]([\s\S]*?)\[\/math\]/g;
const INLINE_TAG = /\[\/inline\]([\s\S]*?)\[\/inline\]/g;

/**
 * Rewrites the custom math tags some models emit to dollar delimiters:
 * `[/math]...[/math]` becomes `$$...$$` and `[/inline]...[/inline]` becomes `$...$`.
 */
export function rewriteCustomMathTags(text: string): string {
  return text
    .replace(MATH_TAG, (_, body: string) => `$$${body.trim()}$$`)
    .replace(INLINE_TAG, (_, body: string) => `$${body.trim()}$`);
}

/**
 * Normalizes the alternative math delimiters language models commonly emit (LaTeX
 * `\(...\)` / `\[...\]` brackets and `[/math]` / `[/inline]` tags) to the `$...$` /
 * `$$...$$` delimiters remark-math parses. Pass it to the `preprocess` prop of
 * `StreamdownTextPrimitive`.
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

/** Length of the run of `char` starting at `start`. */
function runLength(text: string, start: number, char: string): number {
  let length = 0;
  while (text[start + length] === char) length++;
  return length;
}

/** Start index of the line containing start. */
function lineStart(text: string, start: number): number {
  return (
    Math.max(
      text.lastIndexOf("\r", start - 1),
      text.lastIndexOf("\n", start - 1),
    ) + 1
  );
}

/** End index of the line containing start, excluding its line ending. */
function lineEnd(text: string, start: number): number {
  const carriageReturn = text.indexOf("\r", start);
  const lineFeed = text.indexOf("\n", start);
  if (carriageReturn === -1) return lineFeed === -1 ? text.length : lineFeed;
  if (lineFeed === -1) return carriageReturn;
  return Math.min(carriageReturn, lineFeed);
}

/** Start index of the line after end, accounting for CRLF. */
function nextLineStart(text: string, end: number): number {
  if (end >= text.length) return text.length;
  return text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
}

function peelBlockquotes(prefix: string): { depth: number; rest: string } {
  let rest = prefix;
  let depth = 0;
  while (rest.length > 0) {
    const blockquote = rest.match(/^ {0,3}>[ \t]?/);
    if (!blockquote) break;
    rest = rest.slice(blockquote[0].length);
    depth += 1;
  }
  return { depth, rest };
}

function isFencePrefix(prefix: string): boolean {
  let remaining = peelBlockquotes(prefix).rest;
  while (remaining.length > 0) {
    const listItem = remaining.match(/^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/);
    if (!listItem) break;
    remaining = remaining.slice(listItem[0].length);
  }
  return /^ {0,3}$/.test(remaining);
}

function isClosingFencePrefix(prefix: string, quoteDepth: number): boolean {
  const peeled = peelBlockquotes(prefix);
  return peeled.depth === quoteDepth && /^ {0,3}$/.test(peeled.rest);
}

function closingFenceEnd(
  text: string,
  start: number,
  end: number,
  minimumLength: number,
  quoteDepth: number,
): number {
  const line = text.slice(start, end);
  const runStart = line.indexOf("`");
  if (
    runStart === -1 ||
    !isClosingFencePrefix(line.slice(0, runStart), quoteDepth)
  ) {
    return -1;
  }

  const length = runLength(line, runStart, "`");
  if (length < minimumLength) return -1;
  if (!/^[ \t]*$/.test(line.slice(runStart + length))) return -1;
  return start + runStart + length;
}

/**
 * End index (exclusive) of the code span or fence whose backtick run starts at
 * `start`. An unclosed fence extends through the end of the text; -1 means an
 * inline code span is unclosed and its backticks read as literal text.
 */
function codeSpanEnd(text: string, start: number): number {
  const delimiterLength = runLength(text, start, "`");
  const openingLineStart = lineStart(text, start);
  const openingPrefix = text.slice(openingLineStart, start);
  const openingLineEnd = lineEnd(text, start + delimiterLength);
  const openingInfo = text.slice(start + delimiterLength, openingLineEnd);
  const isFence =
    delimiterLength >= 3 &&
    isFencePrefix(openingPrefix) &&
    !openingInfo.includes("`");

  if (isFence) {
    if (openingLineEnd === text.length) return text.length;

    let closingLineStart = nextLineStart(text, openingLineEnd);
    while (closingLineStart <= text.length) {
      const closingLineEnd = lineEnd(text, closingLineStart);
      const close = closingFenceEnd(
        text,
        closingLineStart,
        closingLineEnd,
        delimiterLength,
        peelBlockquotes(openingPrefix).depth,
      );
      if (close !== -1) return close;
      if (closingLineEnd === text.length) break;
      closingLineStart = nextLineStart(text, closingLineEnd);
    }
    return text.length;
  }

  let index = start + delimiterLength;
  while (index < text.length) {
    const next = text.indexOf("`", index);
    if (next === -1) return -1;
    const nextLength = runLength(text, next, "`");
    if (nextLength === delimiterLength) return next + nextLength;
    index = next + nextLength;
  }
  return -1;
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
      const end = codeSpanEnd(text, index);
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
 * End index (exclusive) of the run at `index` that must be copied unchanged: a `\x`
 * escape, a code span, a `$$` display delimiter, an inline math span, or a plain
 * character. Returns `index` itself for a single `$`, which the caller has to decide.
 */
function endOfVerbatimRun(text: string, index: number): number {
  const char = text[index];
  if (char === "\\") return Math.min(index + 2, text.length);
  if (char === "`") {
    const end = codeSpanEnd(text, index);
    return end === -1 ? index + runLength(text, index, "`") : end;
  }
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
 * is not escaped twice, and code spans and fences are never rewritten.
 *
 * A `$` followed by a digit is only currency when it does not open a plausible math
 * span, so the text up to the next `$` is inspected first: `$0$` and `$5x = 10$`
 * survive, while `$5 and $7` is escaped as before. Deciding on the delimiter pair
 * rather than on the digit alone is what keeps a wrong guess local: an accepted span
 * contains no `$`, so an inserted escape can never fall between a delimiter pair and
 * shift every delimiter that follows it.
 */
export function escapeCurrencyDollars(text: string): string {
  let out = "";
  let index = 0;

  while (index < text.length) {
    const verbatimEnd = endOfVerbatimRun(text, index);
    if (verbatimEnd > index) {
      out += text.slice(index, verbatimEnd);
      index = verbatimEnd;
      continue;
    }
    out += opensCurrencyAmount(text, index) ? "\\$" : "$";
    index += 1;
  }

  return out;
}
