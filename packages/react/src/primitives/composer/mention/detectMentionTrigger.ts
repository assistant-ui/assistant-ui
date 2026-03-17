/**
 * Detect a mention trigger in text relative to the cursor position.
 *
 * @internal Exported for testing and for the MentionResource.
 */
export function detectMentionTrigger(
  text: string,
  triggerChar: string,
  cursorPosition: number,
): {
  query: string;
  offset: number;
} | null {
  // Only consider text up to the cursor
  const textUpToCursor = text.slice(0, cursorPosition);

  // Search backwards from cursor for the trigger character
  // Uses same boundary rules as Lexical's findTriggerMatch:
  // stop at space or newline during scan
  for (let i = textUpToCursor.length - 1; i >= 0; i--) {
    const char = textUpToCursor[i]!;

    // Stop at whitespace — trigger must be contiguous with cursor
    if (char === " " || char === "\n") return null;

    if (textUpToCursor.startsWith(triggerChar, i)) {
      // Trigger must be preceded by space, newline, or be at start of text
      if (
        i > 0 &&
        textUpToCursor[i - 1] !== " " &&
        textUpToCursor[i - 1] !== "\n"
      )
        continue;

      const query = textUpToCursor.slice(i + triggerChar.length);

      return { query, offset: i };
    }
  }

  return null;
}
