import type { ReactNode } from "react";
import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { ICON_NAMES } from "../ir";

const ICON_SIZE_TOKENS = ["sm", "md", "lg"] as const;
const ICON_SIZE_PX: Record<(typeof ICON_SIZE_TOKENS)[number], number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

const ICON_GLYPHS: Record<(typeof ICON_NAMES)[number], ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="5.5" y1="5.5" x2="7.5" y2="7.5" />
      <line x1="16.5" y1="16.5" x2="18.5" y2="18.5" />
      <line x1="18.5" y1="5.5" x2="16.5" y2="7.5" />
      <line x1="7.5" y1="16.5" x2="5.5" y2="18.5" />
    </>
  ),
  moon: <path d="M19 13.5A8.5 8.5 0 1 1 10.5 4.5 6.8 6.8 0 0 0 19 13.5Z" />,
  cloud: (
    <path d="M7 18a4 4 0 1 1 .5-8A5.5 5.5 0 0 1 17.5 11.5 3.5 3.5 0 0 1 17 18Z" />
  ),
  rain: (
    <>
      <path d="M6.5 13a3 3 0 1 1 .4-6A4.5 4.5 0 0 1 15.5 8.5 3 3 0 0 1 15 13Z" />
      <line x1="8" y1="15" x2="7" y2="18" />
      <line x1="12" y1="15" x2="11" y2="18" />
      <line x1="16" y1="15" x2="15" y2="18" />
    </>
  ),
  snow: (
    <>
      <path d="M6.5 13a3 3 0 1 1 .4-6A4.5 4.5 0 0 1 15.5 8.5 3 3 0 0 1 15 13Z" />
      <circle cx="7.5" cy="17" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  wind: (
    <>
      <path d="M3 7.5h10.5a2.5 2.5 0 1 0-2-4" />
      <path d="M3 12h14a2.5 2.5 0 1 1-2 4" />
      <path d="M3 16.5h8" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5z" />,
  pause: (
    <>
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
    </>
  ),
  check: <path d="M4 12.5l5 5.5 11-12" />,
  x: (
    <>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
  star: (
    <path d="M12 2.5l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3-5.6-3-5.6 3 1.4-6.3-4.8-4.3 6.4-.6z" />
  ),
  heart: (
    <path d="M12 20s-7.5-4.7-9.8-9.6C.6 6.8 3 3.3 6.6 3.3c2 0 3.7 1.1 5.4 3.3 1.7-2.2 3.4-3.3 5.4-3.3 3.6 0 6 3.5 4.4 7.1C19.5 15.3 12 20 12 20z" />
  ),
  "arrow-right": <path d="M4 12h15M13 6l6 6-6 6" />,
  "arrow-up-right": <path d="M7 17L17 7M9 7h8v8" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s7-6.7 7-12.2A7 7 0 1 0 5 8.8C5 14.3 12 21 12 21z" />
      <circle cx="12" cy="8.8" r="2.3" />
    </>
  ),
  plane: (
    <>
      <path d="M3 12l18-8-6 18-3-7-7-3z" />
      <path d="M12 15l3-3" />
    </>
  ),
  truck: (
    <>
      <path d="M2 8h11v9H2z" />
      <path d="M13 11h4l3 3v3h-7z" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="17" cy="19" r="1.8" />
    </>
  ),
  "credit-card": (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="20" y1="20" x2="15.3" y2="15.3" />
    </>
  ),
  bell: (
    <>
      <path d="M12 3a5.5 5.5 0 0 0-5.5 5.5c0 4.5-2 6-2 6h15s-2-1.5-2-6A5.5 5.5 0 0 0 12 3z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
};

export const iconVocabulary = {
  Icon: {
    description:
      "A small line icon from the built-in set. `size` controls the rendered pixel size.",
    properties: z.object({
      name: z.enum(ICON_NAMES).describe("Which built-in icon to render."),
      size: z
        .enum(ICON_SIZE_TOKENS)
        .optional()
        .describe("Icon size; defaults to `md` (16px)."),
    }),
    render: ({ name, size }) => {
      const glyph = ICON_GLYPHS[name as keyof typeof ICON_GLYPHS];
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
          {glyph}
        </svg>
      );
    },
  },
} satisfies GenerativeUILibrary;
