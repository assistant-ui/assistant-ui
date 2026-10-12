import { z } from "zod";
import { IMAGE_SIZE_TOKENS } from "../../ir";
import type { VocabularyDefinition } from "./types";

export const mediaDefinitions = {
  Image: {
    description:
      "An image. Provide `src` and `alt` for accessibility. Put several images in a `Row` for a gallery, or a `sm` image beside text for a thumbnail.",
    properties: z.object({
      src: z
        .string()
        .describe(
          "Image URL, taken from a tool result or the user; never invent one.",
        ),
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
  Diagram: {
    description:
      "A diagram drawn from Mermaid source, such as a flowchart, a sequence of messages, or the states of a process. Keep it small and label the nodes in plain words.",
    properties: z.object({
      code: z
        .string()
        .describe(
          "Mermaid source, such as `flowchart LR` followed by `A[Order] --> B[Ship]`.",
        ),
      title: z
        .union([z.string(), z.number()])
        .optional()
        .describe("A caption for the diagram, as text or a number."),
    }),
  },
  Map: {
    description:
      "Places on a map, such as the stops of a trip or locations to compare, with an optional route through them in order.",
    properties: z.object({
      places: z
        .array(
          z.object({
            label: z.string().describe("The place's name."),
            lat: z.number().describe("Latitude in degrees."),
            lng: z.number().describe("Longitude in degrees."),
            detail: z
              .string()
              .optional()
              .describe("A short note about the place."),
          }),
        )
        .describe("The places, in order."),
      route: z
        .boolean()
        .optional()
        .describe("Draw a line through the places in order."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
