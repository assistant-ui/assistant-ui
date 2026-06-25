import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

export const textVocabulary = {
  Header: {
    description: "A section heading. Renders as a bold title.",
    properties: z.object({
      text: z.string().describe("The heading text."),
      size: z
        .enum(["sm", "md", "lg", "xl", "2xl", "3xl"])
        .optional()
        .describe("Heading size; defaults to `lg`."),
    }),
    render: ({ text, size, children }) => (
      <h2 data-aui="header" data-aui-size={size ?? "lg"}>
        {text}
        {children}
      </h2>
    ),
  },
  Text: {
    description: "A run of text. Use for paragraphs, labels, or inline copy.",
    properties: z.object({
      value: z.string().describe("The text content."),
      size: z
        .enum(["sm", "md", "lg", "xl", "2xl", "3xl"])
        .optional()
        .describe("Text size; defaults to `md`."),
      weight: z
        .enum(["normal", "medium", "semibold", "bold"])
        .optional()
        .describe("Font weight."),
      color: z
        .enum([
          "emphasis",
          "secondary",
          "alpha-70",
          "white",
          "white-70",
          "white-50",
        ])
        .optional()
        .describe("Foreground color token."),
    }),
    streamProperties: true,
    render: ({ value, size, weight, color, children }) => (
      <p
        data-aui="text"
        data-aui-size={size ?? "md"}
        data-aui-weight={weight}
        data-aui-color={color}
      >
        {value}
        {children}
      </p>
    ),
  },
  Caption: {
    description: "Secondary, de-emphasized text under a primary element.",
    properties: z.object({
      value: z.string().describe("The caption text."),
    }),
    streamProperties: true,
    render: ({ value, children }) => (
      <p data-aui="caption">
        {value}
        {children}
      </p>
    ),
  },
} satisfies GenerativeUILibrary;
