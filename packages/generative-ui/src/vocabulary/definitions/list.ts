import { z } from "zod";
import type { VocabularyDefinition } from "./types";

export const listDefinitions = {
  ListView: {
    description:
      "A vertical list container. Wrap `ListViewItem` children as rows.",
    properties: z.object({}),
  },
  ListViewItem: {
    description:
      "A row inside a ListView. Carries `_action` to make the whole row clickable and keyboard-activatable.",
    properties: z.object({}),
  },
  Steps: {
    description:
      "Numbered steps to follow in order, such as instructions or a how-to guide. Each step has a short `title` saying what to do and an optional `detail` on how.",
    properties: z.object({
      steps: z
        .array(
          z.object({
            title: z
              .union([z.string(), z.number()])
              .describe("What to do, in a few words, as text or a number."),
            detail: z
              .union([z.string(), z.number()])
              .optional()
              .describe(
                "How to do it, or what to watch for, as text or a number.",
              ),
          }),
        )
        .describe("The steps, in order."),
    }),
  },
  Timeline: {
    description:
      "Events in time order, each with a time or date label, such as a schedule, an itinerary, or a history.",
    properties: z.object({
      items: z
        .array(
          z.object({
            time: z
              .union([z.string(), z.number()])
              .describe(
                "When it happens, as the user should read it, such as `Day 1`, `6:00 pm`, or `1969`, as text or a number.",
              ),
            title: z
              .union([z.string(), z.number()])
              .describe("What happens, as text or a number."),
            detail: z
              .union([z.string(), z.number()])
              .optional()
              .describe("More about it, as text or a number."),
          }),
        )
        .describe("The events, in time order."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
