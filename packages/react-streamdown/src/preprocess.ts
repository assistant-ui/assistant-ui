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

// A closer has to sit in the same container as its opener: a root fence is not
// closed by a quoted line, and a quoted fence is closed by one however its
// marker is spaced. Matching the prefix by shape rather than as a literal keeps
// `> ~~~` and `>~~~` equivalent.
const TILDE_FENCE_CLOSE_ROOT = /^ {0,3}(~{3,})[ \t\r]*$/;
const TILDE_FENCE_CLOSE_QUOTED = /^ {0,3}(?:>[ \t]?)+ {0,3}(~{3,})[ \t\r]*$/;
const LINE_IS_QUOTED = /^ {0,3}(?:>[ \t]?)+/;

/**
 * End index (exclusive) of the tilde fence opened by the `~` run at `start`,
 * which the caller has verified starts a line: the end of the first later line
 * carrying a closing run of at least the same length, or the end of `text`
 * when none does — an unclosed fence reads as code to the end of the input,
 * which keeps a fence that is still streaming in inert.
 */
function tildeFenceEnd(text: string, start: number): number {
  const fenceLength = runLength(text, start, "~");
  const openerLine = text.slice(text.lastIndexOf("\n", start - 1) + 1, start);
  const closer = LINE_IS_QUOTED.test(openerLine)
    ? TILDE_FENCE_CLOSE_QUOTED
    : TILDE_FENCE_CLOSE_ROOT;
  let lineStart = text.indexOf("\n", start);

  while (lineStart !== -1) {
    const lineEnd = text.indexOf("\n", lineStart + 1);
    const line = text.slice(
      lineStart + 1,
      lineEnd === -1 ? undefined : lineEnd,
    );
    const close = closer.exec(line);
    if (close && close[1]!.length >= fenceLength) {
      return lineEnd === -1 ? text.length : lineEnd;
    }
    lineStart = lineEnd;
  }

  return text.length;
}

/** Whether the character at `index` starts a line, allowing ≤3 spaces indent. */
function atLineStart(text: string, index: number): boolean {
  let cursor = index;
  let indent = 0;
  while (cursor > 0 && text[cursor - 1] === " " && indent < 3) {
    cursor--;
    indent++;
  }
  if (cursor === 0 || text[cursor - 1] === "\n") return true;

  // A fence keeps its meaning inside a blockquote, so a line carrying only
  // blockquote markers still opens one. Four spaces would make it an indented
  // code block instead, so the marker may carry at most three.
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  return /^ {0,3}(?:>[ \t]?)+$/.test(text.slice(lineStart, cursor));
}

/**
 * Applies `rewrite` to the stretches of `text` outside code spans and fences,
 * copying code through verbatim, so a delimiter shown as code is never
 * rewritten. `\x` escapes are stepped over when scanning so an escaped
 * backtick does not open a span, and a delimiter pair straddling a code
 * boundary stays as written. Each stretch is passed the characters adjacent to
 * it so the rewrite can make line-boundary decisions that survive the split.
 *
 * Backtick regions are found with `codeSpanEnd`, which {@link
 * escapeCurrencyDollars} also uses, and read as CommonMark does: an unclosed
 * one- or two-backtick run is literal text, an unclosed three-plus run is a
 * fence still streaming in and protects to the end of the input, and fences are
 * not line-anchored. The unclosed three-plus case is where this walker and
 * `escapeCurrencyDollars` differ, since that one treats the run as literal. Tilde
 * fences are line-anchored per CommonMark: a `~~~` run starting a line opens
 * one, and it closes on a line carrying only an at-least-as-long tilde run.
 */
function rewriteOutsideCode(
  text: string,
  rewrite: (segment: string, precededBy: string, followedBy: string) => string,
): string {
  let out = "";
  let index = 0;
  let plainStart = 0;

  const flush = (end: number, followedBy: string) => {
    const segment = text.slice(plainStart, end);
    if (segment !== "") out += rewrite(segment, out.slice(-1), followedBy);
  };

  const copyVerbatim = (to: number) => {
    flush(index, text[index]!);
    out += text.slice(index, to);
    index = to;
    plainStart = to;
  };

  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
    } else if (char === "`") {
      const run = runLength(text, index, "`");
      const end = codeSpanEnd(text, index);
      if (end !== -1) copyVerbatim(end);
      else if (run >= 3) copyVerbatim(text.length);
      else index += run;
    } else if (
      char === "~" &&
      runLength(text, index, "~") >= 3 &&
      atLineStart(text, index)
    ) {
      copyVerbatim(tildeFenceEnd(text, index));
    } else {
      index += 1;
    }
  }
  flush(text.length, "");

  return out;
}

/**
 * Emits a display-math body in the `$$` form remark-math parses: `$$body$$` on
 * one span for a single-line body, and for a body spanning lines the fenced
 * form, on lines the `$$` markers own. remark-math parses multiline `$$` as a
 * flow construct: the opening marker has to start a line and the closing marker
 * to end one, and it reads whatever else shares those lines as fence metadata
 * rather than as math.
 *
 * A delimiter pair wrapping nothing is left as written: `$$$$` would itself
 * open a fence that never closes.
 */
function emitDisplayMath(
  match: string,
  body: string,
  offset: number,
  source: string,
  precededBy: string,
  followedBy: string,
): string {
  const trimmed = body.trim();
  if (trimmed === "") return match;
  if (!trimmed.includes("\n")) return `$$${trimmed}$$`;

  const before = offset === 0 ? precededBy : source[offset - 1]!;
  const afterStart = offset + match.length;
  const after = afterStart === source.length ? followedBy : source[afterStart]!;
  // A CRLF document puts the carriage return next to the match, so both endings
  // count as already being at a line boundary.
  const endsLine = (char: string) =>
    char === "" || char === "\n" || char === "\r";
  const lead = endsLine(before) ? "" : "\n";
  const tail = endsLine(after) ? "" : "\n";
  return `${lead}$$\n${trimmed}\n$$${tail}`;
}

/**
 * Rewrites LaTeX bracket delimiters to dollar delimiters: `\(...\)` becomes
 * `$...$` (inline) and `\[...\]` becomes `$$...$$` (display, fenced when the
 * body spans lines — see {@link emitDisplayMath}). A single or double leading
 * backslash is accepted, since models emit both depending on escaping.
 * remark-math only recognizes the dollar form, so without this rewrite bracket
 * math renders as plain text.
 */
export function rewriteLatexBracketDelimiters(text: string): string {
  return rewriteOutsideCode(text, (segment, precededBy, followedBy) =>
    segment
      .replace(LATEX_INLINE_DELIMITER, (match: string, body: string) => {
        const trimmed = body.trim();
        return trimmed === "" ? match : `$${trimmed}$`;
      })
      .replace(
        LATEX_DISPLAY_DELIMITER,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(match, body, offset, source, precededBy, followedBy),
      ),
  );
}

const MATH_TAG = /\[\/math\]([\s\S]*?)\[\/math\]/g;
const INLINE_TAG = /\[\/inline\]([\s\S]*?)\[\/inline\]/g;

/**
 * Rewrites the custom math tags some models emit to dollar delimiters:
 * `[/math]...[/math]` becomes `$$...$$` (fenced when the body spans lines — see
 * {@link emitDisplayMath}) and `[/inline]...[/inline]` becomes `$...$`.
 */
export function rewriteCustomMathTags(text: string): string {
  return rewriteOutsideCode(text, (segment, precededBy, followedBy) =>
    segment
      .replace(
        MATH_TAG,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(match, body, offset, source, precededBy, followedBy),
      )
      .replace(INLINE_TAG, (match: string, body: string) => {
        const trimmed = body.trim();
        return trimmed === "" ? match : `$${trimmed}$`;
      }),
  );
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

/**
 * End index (exclusive) of the code span or fence whose backtick run starts at
 * `start`, or -1 when that run is never closed and its backticks read as literal
 * text.
 */
function codeSpanEnd(text: string, start: number): number {
  const delimiterLength = runLength(text, start, "`");
  const delimiter = "`".repeat(delimiterLength);
  let closed = text.indexOf(delimiter, start + delimiterLength);

  // Fences may close on a longer run; one- and two-backtick inline spans may not.
  while (delimiterLength < 3 && closed !== -1) {
    const closedLength = runLength(text, closed, "`");
    if (closedLength === delimiterLength) break;
    closed = text.indexOf(delimiter, closed + closedLength);
  }

  return closed === -1 ? -1 : closed + delimiterLength;
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
