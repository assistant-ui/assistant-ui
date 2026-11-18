"use client";

// Loads the sample's code only on pages that render it. MDX imports reach every
// page of a docs route, so a static import here would ship this sample's
// dependencies to all of them. The page is server-rendered either way.
import { lazyComponent } from "@/lib/lazy-component";

export const TooltipBar = lazyComponent(() =>
  import("./samples-client").then((mod) => mod.TooltipBar),
);

export const HighlightSample = lazyComponent(() =>
  import("./samples-client").then((mod) => mod.HighlightSample),
);

export const ZoomWorld = lazyComponent(() =>
  import("./samples-client").then((mod) => mod.ZoomWorld),
);

export const FitSample = lazyComponent(() =>
  import("./samples-client").then((mod) => mod.FitSample),
);

export const SpecPlayground = lazyComponent(() =>
  import("./samples-client").then((mod) => mod.SpecPlayground),
);
