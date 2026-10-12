import { z } from "zod";
import { ALIGNS, JUSTIFIES } from "../../ir";
import type { VocabularyDefinition } from "./types";

const cardActionSchema = z.looseObject({
  type: z
    .string()
    .describe("The action type, resolved by the host's action registry."),
});

const cardFooterButtonSchema = z.object({
  label: z
    .union([z.string(), z.number()])
    .describe("Footer button label text or number."),
  _action: cardActionSchema
    .optional()
    .describe("Action fired when the button is activated."),
});

export const layoutDefinitions = {
  Card: {
    description:
      "A titled section of related content, the default way to break a response into parts. It renders as plain content, so several in a row read as one answer rather than a stack of boxes; it takes on a framed surface only when `background` is set, when `confirm`/`cancel` add a footer, or when it is a slot in a `Carousel`. Set `asForm` to collect named child control values on submit.",
    properties: z.object({
      title: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional card title text or number."),
      padding: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .describe(
          "Padding in 4px units (e.g. 2 = 8px). 0 to 8 is the supported range.",
        ),
      background: z
        .string()
        .optional()
        .describe(
          "Background color or gradient (any CSS background value). Setting this also switches the card's own text to white, since a custom background makes the card a tinted surface; children can still opt into a different color explicitly.",
        ),
      asForm: z
        .boolean()
        .optional()
        .describe(
          "Render as a form; submitting it fires `confirm._action`, or the Card's own `_action` when `confirm` has none, with every named child control's value keyed by `name`.",
        ),
      confirm: cardFooterButtonSchema
        .optional()
        .describe("Confirm button shown in the footer."),
      cancel: cardFooterButtonSchema
        .optional()
        .describe("Cancel button shown in the footer."),
    }),
  },
  Col: {
    description: "A vertical stack; children laid out top to bottom.",
    properties: z.object({
      gap: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
    }),
  },
  Row: {
    description: "A horizontal row; children laid out left to right.",
    properties: z.object({
      gap: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
      justify: z.enum(JUSTIFIES).optional().describe("Main-axis distribution."),
    }),
  },
  Spacer: {
    description: "Empty space that pushes neighbors apart.",
    properties: z.object({}),
  },
  Badge: {
    description: "A small labeled tag, e.g. for status or category.",
    properties: z.object({
      value: z
        .union([z.string(), z.number()])
        .describe("Badge text or number."),
      variant: z.string().optional().describe("Visual variant token."),
    }),
  },
  Box: {
    description:
      "A generic container for composition, e.g. a progress bar built from an outer track Box containing a partial-width fill Box. Size, radius, and background accept arbitrary values, so they render as inline styles rather than data-attribute hooks.",
    properties: z.object({
      width: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Width; a number is pixels."),
      height: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Height; a number is pixels."),
      radius: z
        .union([z.literal("full"), z.number()])
        .optional()
        .describe(
          'Corner radius; "full" is a pill/circle, a number is pixels.',
        ),
      background: z
        .string()
        .optional()
        .describe("Background color or gradient (any CSS background value)."),
    }),
  },
  Tabs: {
    description:
      "Panels the user switches between with tabs, one visible at a time. Use it for parallel content the user looks at one part at a time, such as options, plans, or days. Each child is one panel, usually a Col, labeled by the matching entry in `tabs`.",
    properties: z.object({
      tabs: z
        .array(z.string())
        .describe("Tab labels, one per child panel, in order."),
      label: z
        .string()
        .optional()
        .describe("Accessible name for the row of tabs."),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
