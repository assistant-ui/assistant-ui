import { z } from "zod";
import type { VocabularyDefinition } from "./types";

export const factDefinitions = {
  Fact: {
    description:
      "A label/value pair, rendered as a key followed by its value. Use for compact metadata.",
    properties: z.object({
      label: z.string().describe("The fact label (key)."),
      value: z.string().describe("The fact value."),
      delta: z.string().optional().describe("Change from before."),
      trend: z
        .enum(["up", "down", "flat"])
        .optional()
        .describe("Change direction."),
      upIsGood: z.boolean().optional().describe("Whether up is good."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
