import { z } from "zod";
import { ICON_NAMES } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const ICON_SIZE_TOKENS = ["sm", "md", "lg"] as const;

export const iconDefinitions = {
  Icon: {
    description:
      "A small line icon from the built-in set. `size` controls the rendered pixel size.",
    properties: z.object({
      name: z.enum(ICON_NAMES).describe("Which built-in icon to render."),
      size: z
        .enum(ICON_SIZE_TOKENS)
        .optional()
        .describe("Icon size; defaults to `md` (16px)."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
