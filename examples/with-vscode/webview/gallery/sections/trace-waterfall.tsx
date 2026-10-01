import {
  TraceWaterfall,
  type TraceSpan,
} from "@assistant-ui/ui/components/assistant-ui/elements/trace-waterfall.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

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
    status: "failed",
  },
  {
    id: "retry",
    name: "fetch page (retry)",
    depth: 2,
    startMs: 1215,
    durationMs: 30,
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

export default defineSections([
  {
    id: "trace-waterfall",
    title: "Trace waterfall",
    category: "agents",
    notes:
      "Nested spans: completed, one failed fetch, its retry, and the final model call still running; revealed partway, then fully.",
    render: () => (
      <States>
        <State label="3 of 6 visible">
          <TraceWaterfall spans={SPANS} totalMs={1840} visibleCount={3} />
        </State>
        <State label="all visible">
          <TraceWaterfall
            spans={SPANS}
            totalMs={1840}
            visibleCount={SPANS.length}
          />
        </State>
      </States>
    ),
  },
]);
