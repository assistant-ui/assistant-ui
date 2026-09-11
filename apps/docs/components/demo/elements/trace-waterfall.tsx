"use client";

import {
  TraceWaterfall,
  type TraceSpan,
} from "@/components/assistant-ui/elements/trace-waterfall";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const SPANS: readonly TraceSpan[] = [
  {
    id: "run",
    name: "run",
    depth: 0,
    startMs: 0,
    durationMs: 1840,
    status: "completed",
  },
  {
    id: "model",
    name: "chat.completions",
    depth: 1,
    startMs: 40,
    durationMs: 720,
    status: "completed",
  },
  {
    id: "search",
    name: "web_search",
    depth: 1,
    startMs: 790,
    durationMs: 460,
    status: "completed",
  },
  {
    id: "fetch",
    name: "fetch page",
    depth: 2,
    startMs: 830,
    durationMs: 380,
    status: "completed",
  },
  {
    id: "final",
    name: "chat.completions",
    depth: 1,
    startMs: 1280,
    durationMs: 560,
    status: "running",
  },
];

const PHASES = [700, 700, 700, 700, 0] as const;

export function TraceWaterfallDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <TraceWaterfall
      spans={SPANS}
      totalMs={1840}
      visibleCount={Math.min(phase + 1, SPANS.length)}
    />
  );
}
