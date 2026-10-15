import type { ThreadSuggestion } from "../runtime/interfaces/thread-runtime-core";

/**
 * A suggestion carries no id, so its identity is its content. Repeats of the
 * same content get an occurrence suffix, because keys must be unique and two
 * suggestions that render the same thing are interchangeable.
 */
export const getSuggestionKeys = (
  suggestions: readonly ThreadSuggestion[],
): string[] => {
  const seen = new Map<string, number>();
  return suggestions.map((suggestion) => {
    const content = JSON.stringify([
      suggestion.title,
      suggestion.label,
      suggestion.prompt,
    ]);
    const occurrence = seen.get(content) ?? 0;
    seen.set(content, occurrence + 1);
    return occurrence === 0 ? content : `${content}:${occurrence}`;
  });
};
