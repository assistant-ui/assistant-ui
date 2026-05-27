import { inlineToolArgSchemas } from "./inline-tool-schemas";
import { stripMarkdownJsonFence } from "./strip-markdown-fence";

const normalizeJson = (value: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return null;
  }
};

const matchesInlineToolArgsShape = (parsed: unknown): boolean =>
  inlineToolArgSchemas.some((schema) => schema.safeParse(parsed).success);

/** Text echo of inline tool args — hide when the tool UI already rendered them. */
export const isLeakedInlineToolText = (
  text: string,
  toolArgsTexts: readonly string[] = [],
): boolean => {
  const candidate = stripMarkdownJsonFence(text);
  if (!candidate.startsWith("{")) return false;

  const normalizedCandidate = normalizeJson(candidate);
  if (!normalizedCandidate) return false;

  for (const argsText of toolArgsTexts) {
    const normalizedArgs = normalizeJson(argsText.trim());
    if (normalizedArgs && normalizedArgs === normalizedCandidate) return true;
  }

  try {
    const parsed = JSON.parse(candidate);
    return matchesInlineToolArgsShape(parsed);
  } catch {
    return false;
  }
};
