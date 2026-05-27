import { z } from "zod/v4";
import { stripMarkdownJsonFence } from "./strip-markdown-fence";

const normalizeJson = (value: string): string | null => {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return null;
  }
};

const generateChartArgsSchema = z.object({
  title: z.string(),
  type: z.enum(["bar", "line", "pie"]),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  xKey: z.string(),
  dataKeys: z.array(z.string()),
});

const showLocationArgsSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
});

const selectDateArgsSchema = z.object({
  prompt: z.string(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

const collectContactArgsSchema = z.object({
  prompt: z.string(),
  fields: z.array(z.enum(["name", "email", "phone"])),
});

const INLINE_TOOL_ARG_SCHEMAS = [
  generateChartArgsSchema,
  showLocationArgsSchema,
  selectDateArgsSchema,
  collectContactArgsSchema,
] as const;

const matchesInlineToolArgsShape = (parsed: unknown): boolean =>
  INLINE_TOOL_ARG_SCHEMAS.some((schema) => schema.safeParse(parsed).success);

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
