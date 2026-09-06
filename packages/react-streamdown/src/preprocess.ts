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
// Both marker patterns accept any indentation because their openers do too, so
// a fence written past a list item's content column closes on its own line.
const FENCE_CLOSE_ROOT = {
  "`": /^[ \t]*(`{3,})[ \t\r]*$/,
  "~": /^[ \t]*(~{3,})[ \t\r]*$/,
};
const FENCE_CLOSE_QUOTED = {
  "`": /^[ \t]*(?:>[ \t]?)+[ \t]*(`{3,})[ \t\r]*$/,
  "~": /^[ \t]*(?:>[ \t]?)+[ \t]*(~{3,})[ \t\r]*$/,
};
// What may precede a fence opener on its line: the blockquote and list markers
// whose containers a fence opens inside of, nested in either order, and the
// indentation between them. Each marker takes its own trailing whitespace, so a
// prefix that fails cannot be re-split across two markers, and a list marker
// still requires the space that separates it from its content.
const FENCE_OPEN_PREFIX = /^[ \t]*(?:>[ \t]*|(?:[-*+]|\d{1,9}[.)])[ \t]+)*$/;
// A fence body takes no lazy continuation, so a quoted fence left unclosed ends
// on the first line that drops the marker. A blank line stays inside it, the way
// a fence body carries one at the root.
const QUOTE_CONTINUATION = /^(?:[ \t]*>|[ \t\r]*$)/;

/**
 * End index (exclusive) of the fence opened by the `marker` run at `start`,
 * which the caller has verified opens one: the end of the first later line
 * carrying a closing run of at least the same length, or the end of the
 * container when no line does, since an unclosed fence is one still streaming
 * in. A root fence's container is the whole input; a quoted one ends where its
 * blockquote does.
 */
function fenceEnd(text: string, start: number, marker: "`" | "~"): number {
  const fenceLength = runLength(text, start, marker);
  const openerLine = text.slice(text.lastIndexOf("\n", start - 1) + 1, start);
  const quoted = openerLine.includes(">");
  const closer = quoted ? FENCE_CLOSE_QUOTED[marker] : FENCE_CLOSE_ROOT[marker];
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
    if (quoted && !QUOTE_CONTINUATION.test(line)) return lineStart;
    lineStart = lineEnd;
  }

  return text.length;
}

/**
 * Whether the backtick run at `start` opens a fence rather than a code span: a
 * fence is a flow construct, so its run is three or more backticks carrying
 * nothing but indentation and blockquote markers ahead of them on their line,
 * and an info string, which CommonMark forbids a backtick in.
 *
 * Indentation is not capped at the three columns CommonMark allows, because the
 * cap is relative to the enclosing container and this walker does not track
 * containers: a fence written past a list item's content column, or on its
 * marker line, is ordinary model output, and reading it as a span costs the
 * closer of any such fence whose body carries a blank line. The cost of the
 * wider reading is that a run indented four columns at the root, where
 * CommonMark reads an indented code block, opens a fence here.
 */
function opensBacktickFence(text: string, start: number): boolean {
  const fenceLength = runLength(text, start, "`");
  if (fenceLength < 3) return false;

  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  if (!FENCE_OPEN_PREFIX.test(text.slice(lineStart, start))) return false;

  const lineEnd = text.indexOf("\n", start + fenceLength);
  const info = text.slice(
    start + fenceLength,
    lineEnd === -1 ? undefined : lineEnd,
  );
  return !info.includes("`");
}

/**
 * Whether the tilde run at `index` opens a fence. A tilde run only ever opens
 * one, so unlike a backtick run it needs no info string rule, but it still has
 * to carry the same container prefix as a backtick fence.
 */
function opensTildeFence(text: string, index: number): boolean {
  if (text[index] !== "~" || runLength(text, index, "~") < 3) return false;
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  return FENCE_OPEN_PREFIX.test(text.slice(lineStart, index));
}

/**
 * End index (exclusive) of the backtick construct opened at `start`: the fence
 * when {@link opensBacktickFence} accepts the run, the code span otherwise, or
 * -1 when a span never closes.
 */
function backtickEnd(text: string, start: number): number {
  return opensBacktickFence(text, start)
    ? fenceEnd(text, start, "`")
    : codeSpanEnd(text, start);
}

/**
 * Applies `rewrite` to the stretches of `text` outside code spans and fences,
 * copying code through verbatim, so a delimiter shown as code is never
 * rewritten. `\x` escapes are stepped over when scanning so an escaped
 * backtick does not open a span, and a delimiter pair straddling a code
 * boundary stays as written. Each stretch is passed the characters adjacent to
 * it so the rewrite can make line-boundary decisions that survive the split.
 *
 * Backtick regions are found with `backtickEnd`, which {@link
 * escapeCurrencyDollars} also uses, and split the two constructs a backtick run
 * opens in CommonMark: a run of three or more starting a line opens a fence,
 * which closes on a line carrying only an at-least-as-long run, and a run
 * anywhere else opens a code span, which closes on a run of exactly its own
 * length wherever on a line that run sits, and never past the paragraph it
 * opens in. An unclosed span reads as literal text, while an unclosed fence is
 * one still streaming in and protects to the end of its container. Tilde runs
 * only ever open a fence, read the same way.
 */
function rewriteOutsideCode(
  text: string,
  rewrite: (
    segment: string,
    precededBy: string,
    followedBy: string,
    lineHead: (offset: number) => string,
  ) => string,
): string {
  let out = "";
  let index = 0;
  let plainStart = 0;

  const flush = (end: number, followedBy: string) => {
    const segment = text.slice(plainStart, end);
    if (segment === "") return;
    const start = plainStart;
    // A segment begins after any code span, so the line it sits on can start
    // earlier than the segment does and only the original text has it.
    const lineHead = (offset: number) => {
      const at = start + offset;
      return text.slice(text.lastIndexOf("\n", at - 1) + 1, at);
    };
    out += rewrite(segment, out.slice(-1), followedBy, lineHead);
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
      const end = backtickEnd(text, index);
      if (end !== -1) copyVerbatim(end);
      else index += runLength(text, index, "`");
    } else if (opensTildeFence(text, index)) {
      copyVerbatim(fenceEnd(text, index, "~"));
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
const LINE_PREFIX = /^(?:[ \t]*(?:>[ \t]*)*)(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?/;

/**
 * The prefix a following line needs to stay inside the block the match opened
 * in: a blockquote marker repeats, a list marker becomes the spaces its content
 * is indented by, and a plain indent is copied.
 */
function continuationPrefix(lineHead: string): string {
  return (LINE_PREFIX.exec(lineHead)?.[0] ?? "").replace(/[^>\t]/g, " ");
}

function emitDisplayMath(
  match: string,
  body: string,
  offset: number,
  source: string,
  precededBy: string,
  followedBy: string,
  lineHead: (offset: number) => string,
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

  // Markers written at the root column would end the list item or blockquote the
  // math was written inside, so they carry that container's prefix and the body
  // is aligned to it.
  const prefix = continuationPrefix(lineHead(offset));
  const quoted = prefix.includes(">");
  // The body is split before trimming, since trimming would take the shared
  // indentation off the first line only and leave the block ragged.
  const bodyLines = body.split("\n");
  while (bodyLines.length > 0 && bodyLines[0]!.trim() === "") bodyLines.shift();
  while (bodyLines.length > 0 && bodyLines.at(-1)!.trim() === "") {
    bodyLines.pop();
  }
  // Only the indentation the whole body shares is replaced by the container
  // prefix, so an aligned block keeps its relative indentation.
  const shared = bodyLines.reduce(
    (least, line) =>
      line.trim() === ""
        ? least
        : Math.min(least, /^[ \t]*/.exec(line)![0].length),
    Number.POSITIVE_INFINITY,
  );
  const lines = bodyLines.map((line) => {
    // A line already carrying the blockquote marker keeps the spacing it was
    // written with; `>a` and `> a` are the same blockquote. Indentation alone
    // is not that signal, since a body may legitimately be indented.
    if (quoted && /^[ \t]*>/.test(line)) return line;
    return `${prefix}${line.slice(Number.isFinite(shared) ? shared : 0)}`;
  });

  return `${lead}${prefix}$$\n${lines.join("\n")}\n${prefix}$$${tail}`;
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
  // The display rewrite runs first: its offsets index the segment as the walker
  // cut it, and an inline rewrite ahead of it would shift them off the line
  // whose prefix the fence copies.
  return rewriteOutsideCode(text, (segment, precededBy, followedBy, lineHead) =>
    segment
      .replace(
        LATEX_DISPLAY_DELIMITER,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(
            match,
            body,
            offset,
            source,
            precededBy,
            followedBy,
            lineHead,
          ),
      )
      .replace(LATEX_INLINE_DELIMITER, (match: string, body: string) => {
        const trimmed = body.trim();
        return trimmed === "" ? match : `$${trimmed}$`;
      }),
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
  return rewriteOutsideCode(text, (segment, precededBy, followedBy, lineHead) =>
    segment
      .replace(
        MATH_TAG,
        (match: string, body: string, offset: number, source: string) =>
          emitDisplayMath(
            match,
            body,
            offset,
            source,
            precededBy,
            followedBy,
            lineHead,
          ),
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

// The paragraph break a code span cannot reach past. `BLANK_LINE` cannot serve
// here: it does not admit the carriage return of a CRLF document, and widening
// it would change which bodies `isMathBody` accepts. Sticky so the scan starts
// at the run without copying the rest of the input on every backtick.
const PARAGRAPH_BREAK = /\n[ \t\r]*\n/g;

/** Length of the run of `char` starting at `start`. */
function runLength(text: string, start: number, char: string): number {
  let length = 0;
  while (text[start + length] === char) length++;
  return length;
}

/**
 * End index (exclusive) of the code span whose backtick run starts at `start`,
 * or -1 when that run is never closed and its backticks read as literal text. A
 * span closes on a run of exactly its own length, wherever on a line that run
 * sits; a shorter or longer run is content, and a blank line ends the search
 * with the paragraph.
 */
function codeSpanEnd(text: string, start: number): number {
  const delimiterLength = runLength(text, start, "`");
  const delimiter = "`".repeat(delimiterLength);
  // A span is an inline construct, so it cannot reach past the paragraph it
  // opens in and a run left open in prose does not swallow a later fence.
  PARAGRAPH_BREAK.lastIndex = start;
  const blank = PARAGRAPH_BREAK.exec(text);
  const limit = blank ? blank.index : text.length;
  let closed = text.indexOf(delimiter, start + delimiterLength);

  while (closed !== -1 && closed < limit) {
    const closedLength = runLength(text, closed, "`");
    if (closedLength === delimiterLength) break;
    closed = text.indexOf(delimiter, closed + closedLength);
  }

  return closed === -1 || closed >= limit ? -1 : closed + delimiterLength;
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
      const end = backtickEnd(text, index);
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
 * escape, a code span or fence, a `$$` display delimiter, an inline math span, or a
 * plain character. Returns `index` itself for a single `$`, which the caller has to
 * decide.
 */
function endOfVerbatimRun(text: string, index: number): number {
  const char = text[index];
  if (char === "\\") return Math.min(index + 2, text.length);
  if (char === "`") {
    const end = backtickEnd(text, index);
    return end === -1 ? index + runLength(text, index, "`") : end;
  }
  if (opensTildeFence(text, index)) return fenceEnd(text, index, "~");
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
