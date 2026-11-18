"use client";

// The tooltip skin pulls in diagrammatic's interactive layer. Demo files reach
// every page of a docs route through MDX, so the skin loads only on the pages
// that render a chart with it. The chart itself is server-rendered either way.
import { lazyComponent } from "@/lib/lazy-component";

export const FigTooltip = lazyComponent(() =>
  import("./fig-tooltip.impl").then((mod) => mod.FigTooltip),
);
