import { Chart } from "@assistant-ui/ui/components/assistant-ui/elements/chart.tsx";
import { defineSections } from "../types";

const POINTS = [
  18, 22, 19, 31, 28, 42, 38, 51, 47, 63, 58, 71, 69, 84, 92,
] as const;

export default defineSections([
  {
    id: "chart",
    title: "Chart",
    category: "content",
    notes: "Area, line and bars variants, fully revealed.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Chart
          label="Runs this week"
          value="92"
          delta="+34%"
          points={POINTS}
          visibleCount={POINTS.length}
          variant="area"
        />
        <Chart
          label="p95 latency"
          value="1.2s"
          delta="−18%"
          points={POINTS}
          visibleCount={POINTS.length}
          variant="line"
        />
        <Chart
          label="Tokens per run"
          value="4.1k"
          delta="+9%"
          points={POINTS}
          visibleCount={POINTS.length}
          variant="bars"
        />
      </div>
    ),
  },
  {
    id: "chart-streaming",
    title: "Chart (streaming)",
    category: "content",
    notes: "Six of fifteen points revealed.",
    render: () => (
      <Chart
        label="Runs this week"
        value="42"
        delta="+12%"
        points={POINTS}
        visibleCount={6}
        variant="area"
      />
    ),
  },
]);
