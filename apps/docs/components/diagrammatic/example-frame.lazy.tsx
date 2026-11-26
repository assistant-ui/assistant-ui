"use client";

import { lazy, type ComponentProps } from "react";
import { FallbackBoundary } from "@/lib/fallback-boundary";
import type { ExampleFrame as Frame } from "./example-frame";

// The frame loads on the pages that show examples only. Imported directly it
// sat in a chunk that every docs page loads.
const LazyFrame = lazy(() =>
  import("./example-frame").then((mod) => ({ default: mod.ExampleFrame })),
);

// No Suspense boundary, as in lib/lazy-component: hydration keeps the server
// HTML until the chunk arrives. If the chunk fails to load, the reader still
// gets the chart, without the tabs.
export function ExampleFrame(props: ComponentProps<typeof Frame>) {
  return (
    <FallbackBoundary
      fallback={
        <div className="not-prose my-6">
          <div className="mx-auto w-full max-w-[640px]">{props.preview}</div>
        </div>
      }
    >
      <LazyFrame {...props} />
    </FallbackBoundary>
  );
}
