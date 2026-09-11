const WHITESPACE_RE = /\s/u;

export type TriggerMatch = {
  readonly query: string;
  readonly offset: number;
  readonly endOffset: number;
};

/**
 * Locates a trigger query in `text` relative to `cursorPosition`.
 *
 * `offset` is the index of `triggerChar`. `endOffset` is the exclusive end of
 * the span both the textarea and Lexical replace on select. `query` is the
 * search string and may differ from that span.
 *
 * Return null when the caret is at or before the trigger. Escape moves the
 * caret to `offset` so a match there would reopen the popover.
 */
export type TriggerMatcher = (
  text: string,
  triggerChar: string,
  cursorPosition: number,
) => TriggerMatch | null;

export function resolveTriggerMatch(
  text: string,
  triggerChar: string,
  cursorPosition: number,
  match: TriggerMatch | null,
): TriggerMatch | null {
  if (match === null) return null;
  const { query, offset, endOffset } = match;
  if (offset < 0 || offset + triggerChar.length > cursorPosition) return null;
  if (!text.startsWith(triggerChar, offset)) return null;
  if (endOffset < offset + triggerChar.length || endOffset > text.length) {
    return null;
  }
  return { query, offset, endOffset };
}

/**
 * Detect a trigger character in text relative to the cursor position.
 *
 * @internal Exported for testing and for trigger resources.
 */
export function detectTrigger(
  text: string,
  triggerChar: string,
  cursorPosition: number,
  matcher?: TriggerMatcher | undefined,
): TriggerMatch | null {
  if (matcher) {
    return resolveTriggerMatch(
      text,
      triggerChar,
      cursorPosition,
      matcher(text, triggerChar, cursorPosition),
    );
  }

  const textUpToCursor = text.slice(0, cursorPosition);

  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;

    if (WHITESPACE_RE.test(char)) return null;

    if (textUpToCursor.startsWith(triggerChar, i)) {
      if (i > 0 && !WHITESPACE_RE.test(textUpToCursor[i - 1]!)) continue;

      const query = textUpToCursor.slice(i + triggerChar.length);

      return { query, offset: i, endOffset: cursorPosition };
    }
  }

  return null;
}
