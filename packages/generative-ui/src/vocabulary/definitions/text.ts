import { z } from "zod";
import { COLORS, TEXT_SIZES, WEIGHTS } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const textDefinitions = {
  Header: {
    description: "A section heading. Renders as a bold title.",
    properties: z.object({
      text: z
        .union([z.string(), z.number()])
        .describe("The heading text or number."),
      size: z
        .enum(TEXT_SIZES)
        .optional()
        .describe("Heading size; defaults to `lg`."),
    }),
  },
  Text: {
    description: "A run of text. Use for paragraphs, labels, or inline copy.",
    properties: z.object({
      value: z
        .union([z.string(), z.number()])
        .describe("The text or number to display."),
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
      value: z
        .union([z.string(), z.number()])
        .describe("The caption text or number."),
    }),
    streamProperties: true,
  },
} satisfies Record<string, VocabularyDefinition>;
