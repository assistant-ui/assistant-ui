export const stripMarkdownJsonFence = (text: string): string => {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i);
  return match ? match[1]!.trim() : trimmed;
};
