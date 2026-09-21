export function parseFollowUpSuggestions(
  text: string,
  count: number,
): string[] {
  const limit = Math.max(0, Math.floor(count));
  const seen = new Set<string>();

  return text.split("\n").flatMap((line) => {
    const suggestion = line
      .trim()
      .replace(/^(?:(?:[-*•]+|\d+[.)]|\(\d+\))\s*)+/, "")
      .trim()
      .replace(/^["'“‘]+|["'”’]+$/g, "")
      .trim();

    if (!suggestion || seen.has(suggestion) || seen.size >= limit) return [];
    seen.add(suggestion);
    return [suggestion];
  });
}
