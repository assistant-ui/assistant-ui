import type { CSSProperties } from "react";

/**
 * Graph-paper grid for the chart canvas. A single foreground-derived dot so
 * the texture tracks light and dark from one token.
 */
export const GRID_STYLE: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at center, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
  backgroundPosition: "center",
};

export const canvasSurface =
  "bg-background dark:bg-popover shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-24px_rgba(0,0,0,0.14)] dark:shadow-none";
