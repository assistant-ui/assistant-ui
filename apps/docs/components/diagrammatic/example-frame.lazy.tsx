"use client";

// The frame loads on the pages that show examples only. Imported directly it
// sat in a chunk that every docs page loads.
import { lazyComponent } from "@/lib/lazy-component";

export const ExampleFrame = lazyComponent(() =>
  import("./example-frame").then((mod) => mod.ExampleFrame),
);
