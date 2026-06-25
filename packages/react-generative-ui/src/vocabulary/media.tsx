import { z } from "zod";
import type { GenerativeUILibrary } from "../types";

export const mediaVocabulary = {
  Image: {
    description: "An image. Provide `src` and `alt` for accessibility.",
    properties: z.object({
      src: z.string().describe("Image URL."),
      alt: z.string().optional().describe("Alt text for accessibility."),
      size: z
        .union([z.enum(["sm", "md", "lg"]), z.number()])
        .optional()
        .describe("Size token or pixel value."),
    }),
    render: ({ src, alt, size }) => (
      <img
        data-aui="image"
        data-aui-size={typeof size === "number" ? `${size}px` : size}
        src={src}
        alt={alt}
      />
    ),
  },
  Divider: {
    description: "A horizontal rule between sections.",
    properties: z.object({
      flush: z
        .boolean()
        .optional()
        .describe("Whether the divider spans the full width with no inset."),
    }),
    render: ({ flush }) => <hr data-aui="divider" data-aui-flush={flush} />,
  },
} satisfies GenerativeUILibrary;
