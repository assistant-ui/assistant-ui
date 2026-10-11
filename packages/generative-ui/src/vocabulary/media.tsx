import type { GenerativeUILibrary } from "../types";
import { mediaDefinitions } from "./definitions/media";
import { imageStyle } from "./imageStyle";

export const mediaVocabulary = {
  Image: {
    ...mediaDefinitions.Image,
    render: ({ src, alt, size, round }) => {
      const { numericSize, style } = imageStyle(size, round);

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
    ...mediaDefinitions.Divider,
    render: ({ flush }) => (
      <hr data-aui="divider" data-aui-flush={flush || undefined} />
    ),
  },
} satisfies GenerativeUILibrary;
