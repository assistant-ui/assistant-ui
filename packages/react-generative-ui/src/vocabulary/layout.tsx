import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { ALIGNS, JUSTIFIES } from "../ir";

export const layoutVocabulary = {
  Card: {
    description:
      "A bordered container grouping related content. Optionally titled.",
    properties: z.object({
      title: z.string().optional().describe("Optional card title."),
      padding: z
        .number()
        .optional()
        .describe("Padding in 4px units (e.g. 2 = 8px)."),
      background: z.string().optional().describe("Background token or color."),
    }),
    render: ({ title, padding, background, children }) => (
      <section
        data-aui="card"
        data-aui-padding={padding}
        data-aui-background={background}
      >
        {title ? <header data-aui="card-title">{title}</header> : null}
        {children}
      </section>
    ),
  },
  Col: {
    description: "A vertical stack; children laid out top to bottom.",
    properties: z.object({
      gap: z.number().optional().describe("Gap between children in 4px units."),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
    }),
    render: ({ gap, align, children }) => (
      <div data-aui="col" data-aui-gap={gap} data-aui-align={align}>
        {children}
      </div>
    ),
  },
  Row: {
    description: "A horizontal row; children laid out left to right.",
    properties: z.object({
      gap: z.number().optional().describe("Gap between children in 4px units."),
      align: z.enum(ALIGNS).optional().describe("Cross-axis alignment."),
      justify: z.enum(JUSTIFIES).optional().describe("Main-axis distribution."),
    }),
    render: ({ gap, align, justify, children }) => (
      <div
        data-aui="row"
        data-aui-gap={gap}
        data-aui-align={align}
        data-aui-justify={justify}
      >
        {children}
      </div>
    ),
  },
  Spacer: {
    description: "Empty space that pushes neighbors apart.",
    properties: z.object({}),
    render: () => <div data-aui="spacer" />,
  },
  Badge: {
    description: "A small labeled tag, e.g. for status or category.",
    properties: z.object({
      value: z.string().describe("Badge text."),
      variant: z.string().optional().describe("Visual variant token."),
    }),
    render: ({ value, variant, children }) => (
      <span data-aui="badge" data-aui-variant={variant}>
        {value}
        {children}
      </span>
    ),
  },
} satisfies GenerativeUILibrary;
