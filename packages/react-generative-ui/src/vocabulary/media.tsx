import type { CSSProperties } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { IMAGE_SIZE_TOKENS } from "../ir";

export const mediaVocabulary = {
  Image: {
    description: "An image. Provide `src` and `alt` for accessibility.",
    properties: z.object({
      src: z.string().describe("Image URL."),
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
    render: ({ src, alt, size, round }) => {
      const numericSize = typeof size === "number" ? size : undefined;
      const style: CSSProperties | undefined =
        numericSize === undefined
          ? undefined
          : round
            ? { width: `${numericSize}px`, height: `${numericSize}px` }
            : { maxWidth: `${numericSize}px` };

      return (
        <img
          data-aui="image"
          data-aui-size={numericSize === undefined ? size : undefined}
          data-aui-round={round || undefined}
          src={src}
          alt={alt}
          style={style}
        />
      );
    },
  },
  Divider: {
    description: "A horizontal rule between sections.",
    properties: z.object({
      flush: z
        .boolean()
        .optional()
        .describe("Whether the divider spans the full width with no inset."),
    }),
    render: ({ flush }) => (
      <hr data-aui="divider" data-aui-flush={flush || undefined} />
    ),
  },
} satisfies GenerativeUILibrary;
