import { z } from "zod";
import { IMAGE_SIZE_TOKENS } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const mediaDefinitions = {
  Image: {
    description: "An image. Provide `src` and `alt` for accessibility.",
    properties: z.object({
      src: z.string().describe("Image URL."),
      alt: z.string().describe("Alt text for accessibility."),
      size: z
        .union([z.enum(IMAGE_SIZE_TOKENS), z.number()])
        .optional()
        .describe("Size token or pixel value."),
      round: z
        .boolean()
        .optional()
        .describe(
          "Render as a circular avatar (fully rounded, cropped to a square).",
        ),
    }),
  },
  Divider: {
    description: "A horizontal rule between sections.",
    properties: z.object({
      flush: z
        .boolean()
        .optional()
        .describe("Whether the divider spans the full width with no inset."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
