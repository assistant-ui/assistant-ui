import type { ReactNode } from "react";
import {
  ACCENT_FILL,
  ACCENT_STROKE,
  DIM,
  FAINT,
  GlyphElements,
  GlyphExamples,
  GlyphSvg,
  WindowChrome,
  motion,
} from "@/components/library/glyph";
import type { LibraryCategoryId } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

/*
 * The library's category glyphs, in the grammar of the header's: a 32 by 24
 * line drawing with one accented part, which moves when its link is hovered.
 * Components and Starters are the header's own glyphs for Elements and
 * Examples. A glyph animates inside an element that carries
 * `data-nav-glyph-motion` and the `group/navlink` class.
 */

function GlyphBlocks() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M11 7.5V20.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5.5 11H8.5"
        className={DIM}
      />
      <path
        {...motion("draw", 70)}
        pathLength={100}
        d="M5.5 14H8.5"
        className={DIM}
      />
      <rect
        {...motion("pop", 180)}
        x="18"
        y="12"
        width="8.5"
        height="6"
        rx="1.4"
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphThemes() {
  return (
    <GlyphSvg>
      <circle cx="10.5" cy="12" r="5" className={FAINT} />
      <circle cx="16" cy="12" r="5" className={DIM} />
      <circle
        {...motion("pop", 120)}
        cx="21.5"
        cy="12"
        r="5"
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphRuntimes() {
  return (
    <GlyphSvg>
      <rect x="3" y="7" width="8.5" height="10" rx="1.6" className={DIM} />
      <rect x="20.5" y="7" width="8.5" height="10" rx="1.6" className={DIM} />
      <path d="M5.5 10.5H9M5.5 13.5H8" className={FAINT} />
      <circle
        cx="24.75"
        cy="12"
        r="1.4"
        className="fill-foreground/30 stroke-none"
      />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 12H19.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphIntegrations() {
  return (
    <GlyphSvg>
      <circle
        {...motion("shift", 0, { "--glyph-dx": "-1.6px" })}
        cx="12.5"
        cy="12"
        r="6.5"
        className={DIM}
      />
      <circle
        {...motion("shift", 0, { "--glyph-dx": "1.6px" })}
        cx="19.5"
        cy="12"
        r="6.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphTools() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 5.5c-2 0-2.5 1-2.5 2.600v1.600c0 1.400-.6 2.300-2 2.300 1.400 0 2 .9 2 2.300v1.600c0 1.600.5 2.600 2.500 2.600"
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M19.5 5.5c2 0 2.500 1 2.500 2.600v1.600c0 1.400.6 2.300 2 2.300-1.400 0-2 .9-2 2.300v1.600c0 1.600-.5 2.600-2.500 2.600"
      />
      <rect
        {...motion("pop", 240)}
        x="14.6"
        y="10.6"
        width="2.8"
        height="2.8"
        rx="0.7"
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphUtilities() {
  const sliders: Array<[y: number, x: number, dx: string]> = [
    [6.5, 11, "3px"],
    [12, 21, "-4px"],
    [17.5, 14, "3px"],
  ];
  return (
    <GlyphSvg>
      {sliders.map(([y, x, dx], index) => (
        <g key={y}>
          <path d={`M4 ${y}H28`} className={FAINT} />
          <circle
            {...motion("shift", index * 60, { "--glyph-dx": dx })}
            cx={x}
            cy={y}
            r="2"
            className={cn("fill-background", index === 1 && ACCENT_STROKE)}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

function GlyphSkills() {
  return (
    <GlyphSvg>
      <rect x="8" y="3" width="16" height="18" rx="2" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11.5 7.5H20.5"
        className={DIM}
      />
      <path
        {...motion("draw", 80)}
        pathLength={100}
        d="M11.5 11H18"
        className={DIM}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M11.5 16.200l1.900 1.800 3.600-3.800"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

const GLYPHS: Record<LibraryCategoryId, () => ReactNode> = {
  components: GlyphElements,
  blocks: GlyphBlocks,
  themes: GlyphThemes,
  starters: GlyphExamples,
  runtimes: GlyphRuntimes,
  integrations: GlyphIntegrations,
  tools: GlyphTools,
  utilities: GlyphUtilities,
  skills: GlyphSkills,
};

export function LibraryGlyph({ category }: { category: LibraryCategoryId }) {
  const Glyph = GLYPHS[category];
  return <Glyph />;
}
