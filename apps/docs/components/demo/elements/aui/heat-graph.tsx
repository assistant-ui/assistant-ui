"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HeatGraph } from "@/components/assistant-ui/elements/heat-graph";
import { DemoSurface } from "./surface";

const heatGraphData = Array.from({ length: 112 }, (_, index) => ({
  date: new Date(2026, 0, index + 1),
  count: (index * 7 + Math.floor(index / 9)) % 18,
}));

export function AuiHeatGraphDemo() {
  return (
    <DemoSurface>
      <div className="w-full max-w-2xl min-w-125 scale-[0.82]">
        {/* HeatGraph reads today's date while rendering, so the prerender leaves it to the browser. */}
        <Suspense
          fallback={
            <Skeleton className="aspect-[5/1] w-full motion-reduce:animate-none" />
          }
        >
          <HeatGraph data={heatGraphData} />
        </Suspense>
      </div>
    </DemoSurface>
  );
}
