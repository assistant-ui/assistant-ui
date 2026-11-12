"use client";

// Client examples load only on the pages that render them. MDX imports reach
// every page of a docs route, so importing an example directly would ship
// diagrammatic's interactive layer to all of them. The source shown under
// each example is still read from examples/<file>.tsx.
import { lazyComponent } from "@/lib/lazy-component";

export const DotWorldMapFlagship = lazyComponent(() =>
  import("./examples/dot-world-map/flagship").then((mod) => mod.default),
);

export const DotWorldMapZoom = lazyComponent(() =>
  import("./examples/dot-world-map/zoom").then((mod) => mod.default),
);

export const LineFit = lazyComponent(() =>
  import("./examples/line/fit").then((mod) => mod.default),
);

export const LineFlagship = lazyComponent(() =>
  import("./examples/line/flagship").then((mod) => mod.default),
);

export const LineHighlight = lazyComponent(() =>
  import("./examples/line/highlight").then((mod) => mod.default),
);

export const LineLive = lazyComponent(() =>
  import("./examples/line/live").then((mod) => mod.default),
);

export const LineSelect = lazyComponent(() =>
  import("./examples/line/select").then((mod) => mod.default),
);

export const LineTooltip = lazyComponent(() =>
  import("./examples/line/tooltip").then((mod) => mod.default),
);

export const SparklineLive = lazyComponent(() =>
  import("./examples/sparkline/live").then((mod) => mod.default),
);

export const WorldMapFlagship = lazyComponent(() =>
  import("./examples/world-map/flagship").then((mod) => mod.default),
);

export const WorldMapRegions = lazyComponent(() =>
  import("./examples/world-map/regions").then((mod) => mod.default),
);

export const WorldMapSelect = lazyComponent(() =>
  import("./examples/world-map/select").then((mod) => mod.default),
);

export const WorldMapZoom = lazyComponent(() =>
  import("./examples/world-map/zoom").then((mod) => mod.default),
);
