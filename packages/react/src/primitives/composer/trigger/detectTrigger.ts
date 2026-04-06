const WHITESPACE_RE = /\s/;

/**
 * Detect a trigger character in text relative to the cursor position.
 *
 * @internal Exported for testing and for trigger resources.
 */
export function detectTrigger(
  text: string,
  triggerChar: string,
  cursorPosition: number,
): {
  query: string;
  offset: number;
} | null {
  // Only consider text up to the cursor
  const textUpToCursor = text.slice(0, cursorPosition);

  // Search backwards from cursor for the trigger character.
  // Stop at any whitespace during scan — trigger must be contiguous with cursor.
  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;

    if (WHITESPACE_RE.test(char)) return null;

    if (textUpToCursor.startsWith(triggerChar, i)) {
      // Trigger must be preceded by whitespace or be at start of text
      if (i > 0 && !WHITESPACE_RE.test(textUpToCursor[i - 1]!)) continue;

      const query = textUpToCursor.slice(i + triggerChar.length);

      return { query, offset: i };
    }
  }

  return null;
}
