"use client";

import { Chart } from "@/components/assistant-ui/elements/chart";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const POINTS = [
  18, 22, 19, 31, 28, 42, 38, 51, 47, 63, 58, 71, 69, 84, 92,
] as const;

const PHASES = [
  180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 180, 0,
] as const;

function useStreamedPoints() {
  const { phase } = useStoryPhases(PHASES);
  return Math.min(phase + 1, POINTS.length);
}

export function ChartDemo() {
  const visibleCount = useStreamedPoints();
  return (
    <Chart
      label="Runs this week"
      value="92"
      delta="+34%"
      points={POINTS}
      visibleCount={visibleCount}
      variant="area"
    />
  );
}

export function ChartLineDemo() {
  const visibleCount = useStreamedPoints();
  return (
    <Chart
      label="p95 latency"
      value="1.2s"
      delta="−18%"
      points={POINTS}
      visibleCount={visibleCount}
      variant="line"
    />
  );
}

export function ChartBarsDemo() {
  const visibleCount = useStreamedPoints();
  return (
    <Chart
      label="Tokens per run"
      value="4.1k"
      delta="+9%"
      points={POINTS}
      visibleCount={visibleCount}
      variant="bars"
    />
  );
}
