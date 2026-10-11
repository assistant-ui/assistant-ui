import * as React from "react";
import type { GenerativeUILibrary } from "../types";
import { iconDefinitions } from "./definitions/icon";
import { ICON_SIZE_PX, iconGlyph } from "./iconGlyphs";

export const iconVocabulary = {
  Icon: {
    ...iconDefinitions.Icon,
    render: ({ name, size }) => {
      const glyph = iconGlyph(name);
      if (!glyph) return null;
      const px = ICON_SIZE_PX[(size as keyof typeof ICON_SIZE_PX) ?? "md"];

      return (
        <svg
          data-aui="icon"
          data-aui-name={name}
          data-aui-size={size}
          viewBox="0 0 24 24"
          width={px}
          height={px}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {glyph.map(([tag, attributes], index) =>
            React.createElement(tag, { ...attributes, key: index }),
          )}
        </svg>
      );
    },
  },
} satisfies GenerativeUILibrary;
