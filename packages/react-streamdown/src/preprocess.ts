/**
 * Text transforms for the `preprocess` prop of `MarkdownTextPrimitive`.
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
 * `MarkdownTextPrimitive`.
 *
 * It does not touch currency. Compose it with {@link escapeCurrencyDollars} when
 * single-dollar math is enabled and your content includes prices.
 */
export function normalizeMathDelimiters(text: string): string {
  return rewriteLatexBracketDelimiters(rewriteCustomMathTags(text));
}

const CURRENCY_DOLLAR = /(^|[^\\$])\$(?=\d)/g;

/**
 * Escapes a `$` immediately followed by a digit (`$5`, `$19.99`, `$1,299`) so that
 * remark-math with single-dollar math enabled does not consume currency amounts in
 * prose as math delimiters. A math expression almost always opens with a letter or a
 * `\command`, so a digit after `$` is treated as currency. The `$$` of display math
 * is left intact.
 *
 * Trade-off: an expression that genuinely opens with a digit (`$5x = 10$`) has its
 * leading `$` escaped as well. This is rare in practice.
 */
export function escapeCurrencyDollars(text: string): string {
  return text.replace(CURRENCY_DOLLAR, "$1\\$");
}
