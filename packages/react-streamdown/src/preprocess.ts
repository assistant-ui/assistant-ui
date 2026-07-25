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
const TRAILING_OPERATOR = /[-+*/=<>,;:([\u2013\u2014]$/;

/** Length of the run of `char` starting at `start`. */
function runLength(text: string, start: number, char: string): number {
  let length = 0;
  while (text[start + length] === char) length++;
  return length;
}

/**
 * End index (exclusive) of the code span or fence whose backtick run starts at
 * `start`, or the end of the text when that run is never closed.
 */
function codeSpanEnd(text: string, start: number): number {
  const fence = "`".repeat(runLength(text, start, "`"));
  const closed = text.indexOf(fence, start + fence.length);
  return closed === -1 ? text.length : closed + fence.length;
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
    else if (char === "`") index = codeSpanEnd(text, index);
    else index += 1;
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
 * Whether the body reads as the text between two currency amounts rather than as an
 * expression: running prose (`5 and `), a range (`5-`), or two adjacent words.
 */
function separatesTwoAmounts(body: string): boolean {
  return (
    endsMidSentence(body) || endsOnOperator(body) || ADJACENT_WORDS.test(body)
  );
}

/**
 * Whether the text between two single `$` reads as an inline math expression rather
 * than the text separating two currency amounts. LaTeX syntax settles it; failing
 * that, anything that reads as surrounding text is rejected.
 */
function isMathBody(body: string): boolean {
  if (body.length === 0) return false;
  if (BLANK_LINE.test(body)) return false;
  if (LATEX_SYNTAX.test(body)) return true;
  return !separatesTwoAmounts(body);
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
  if (char === "`") return codeSpanEnd(text, index);
  if (char !== "$") return index + 1;

  const dollars = runLength(text, index, "$");
  if (dollars >= 2) return index + dollars;

  const close = findClosingDollar(text, index);
  const opensMath = close !== -1 && isMathBody(text.slice(index + 1, close));
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
