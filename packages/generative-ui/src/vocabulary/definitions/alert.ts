import { z } from "zod";
import { ALERT_TONES } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const alertDefinitions = {
  Alert: {
    description:
      "A highlighted message conveying urgency. `tone` drives the severity.",
    properties: z.object({
      title: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Alert title text or number."),
      description: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Supporting description text or number."),
      tone: z
        .enum(ALERT_TONES)
        .optional()
        .describe("Severity tone; defaults to `info`."),
    }),
  },
  Carousel: {
    description:
      "A horizontally scrollable group of `Card` children (max 10). Set `label` for an accessible name.",
    properties: z.object({
      label: z
        .string()
        .optional()
        .describe("Accessible label for the carousel."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
