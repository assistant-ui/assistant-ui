import {
  ContextBreakdown,
  type ContextSegment,
} from "@assistant-ui/ui/components/assistant-ui/elements/context-breakdown.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const SEGMENTS: readonly ContextSegment[] = [
  { label: "System prompt", tokens: 1_800, tint: "bg-foreground/45" },
  { label: "Tools", tokens: 4_200, tint: "bg-foreground/25" },
  {
    label: "Attached files",
    tokens: 38_500,
    tint: "bg-blue-500/60 dark:bg-blue-400/60",
  },
  {
    label: "Conversation",
    tokens: 68_400,
    tint: "bg-blue-500 dark:bg-blue-400",
  },
];

const scaled = (scale: number) =>
  SEGMENTS.map((segment) => ({
    ...segment,
    tokens: Math.round(segment.tokens * scale),
  }));

export default defineSections([
  {
    id: "context-breakdown",
    title: "Context breakdown",
    category: "agents",
    notes: "A third of the window, nearly full, and over the limit.",
    render: () => (
      <States>
        <State label="35% used">
          <ContextBreakdown segments={scaled(0.4)} limit={128_000} />
        </State>
        <State label="88% used">
          <ContextBreakdown segments={SEGMENTS} limit={128_000} />
        </State>
        <State label="over the limit">
          <ContextBreakdown segments={scaled(1.3)} limit={128_000} />
        </State>
      </States>
    ),
  },
]);
