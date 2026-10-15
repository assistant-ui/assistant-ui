import { z } from "zod";
import type { VocabularyDefinition } from "./types";

export const factDefinitions = {
  Fact: {
    description:
      "A label/value pair, rendered as a key followed by its value. Use for compact metadata, and put an answer's key figures side by side in a `Row`.",
    properties: z.object({
      label: z
        .union([z.string(), z.number()])
        .describe("The fact label (key) as text or a number."),
      value: z
        .union([z.string(), z.number()])
        .describe("The fact value as text or a number."),
      delta: z.string().optional().describe("Change from before."),
      trend: z
        .enum(["up", "down", "flat"])
        .optional()
        .describe("Change direction."),
      upIsGood: z.boolean().optional().describe("Whether up is good."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
