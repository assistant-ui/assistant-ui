/**
 * Extracts itemId from providerMetadata.
 *
 * Providers like OpenAI use itemId to group related message parts.
 * For example, reasoning messages may be split into multiple paragraphs
 * that all share the same itemId, indicating they're part of one logical thought.
 *
 * @param part - A message part with optional providerMetadata
 * @returns The itemId string if found, undefined otherwise
 */
export const getItemId = (part: any): string | undefined => {
  const metadata = part.providerMetadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  // Search across all providers in metadata (openai, anthropic, etc.)
  for (const providerData of Object.values(metadata)) {
    if (
      providerData &&
      typeof providerData === "object" &&
      "itemId" in providerData
    ) {
      return String((providerData as any).itemId);
    }
  }
  return undefined;
};
