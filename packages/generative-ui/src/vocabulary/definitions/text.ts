import { z } from "zod";
import { COLORS, TEXT_SIZES, WEIGHTS } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const textDefinitions = {
  Header: {
    description: "A section heading. Renders as a bold title.",
    properties: z.object({
      text: z.string().describe("The heading text."),
      size: z
        .enum(TEXT_SIZES)
        .optional()
        .describe("Heading size; defaults to `lg`."),
    }),
  },
  Text: {
    description: "A run of text. Use for paragraphs, labels, or inline copy.",
    properties: z.object({
      value: z.string().describe("The text content."),
      size: z
        .enum(TEXT_SIZES)
        .optional()
        .describe("Text size; defaults to `md`."),
      weight: z.enum(WEIGHTS).optional().describe("Font weight."),
      color: z.enum(COLORS).optional().describe("Foreground color token."),
    }),
    streamProperties: true,
  },
  Caption: {
    description: "Secondary, de-emphasized text under a primary element.",
    properties: z.object({
      value: z.string().describe("The caption text."),
    }),
    streamProperties: true,
  },
} satisfies Record<string, VocabularyDefinition>;
