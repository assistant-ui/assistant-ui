"use client";

// Loads the sample's code only on pages that render it. MDX imports reach every
// page of a docs route, so a static import here would ship this sample's
// dependencies to all of them. The page is server-rendered either way.
import { lazyComponent } from "@/lib/lazy-component";

export const WaterfallSample = lazyComponent(() =>
  import("./waterfall").then((mod) => mod.WaterfallSample),
);
