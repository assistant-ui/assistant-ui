"use client";

import {
  TraceWaterfall,
  type TraceSpan,
} from "@/components/assistant-ui/elements/trace-waterfall";
import { defineStates } from "./types";

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
    status: "completed",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The run is still going, so only the first spans are in and the latest one pulses.",
    Component: () => (
      <TraceWaterfall
        spans={[
          { ...SPANS[0]!, durationMs: 900, status: "running" },
          SPANS[1]!,
          { ...SPANS[2]!, durationMs: 110, status: "running" },
        ]}
        totalMs={900}
        visibleCount={3}
      />
    ),
  },
  {
    key: "success",
    label: "Completed",
    note: "Every span finished and the bars cover the whole run.",
    Component: () => (
      <TraceWaterfall
        spans={SPANS}
        totalMs={1840}
        visibleCount={SPANS.length}
      />
    ),
  },
  {
    key: "error",
    label: "Failed span",
    note: "A tool call failed partway through and its parent ended with it.",
    Component: () => (
      <TraceWaterfall
        spans={[
          { ...SPANS[0]!, durationMs: 1320, status: "failed" },
          SPANS[1]!,
          { ...SPANS[2]!, durationMs: 530, status: "failed" },
          { ...SPANS[3]!, durationMs: 490, status: "failed" },
        ]}
        totalMs={1320}
        visibleCount={4}
      />
    ),
  },
  {
    key: "empty",
    label: "No spans",
    note: "The trace has started but no spans have been recorded yet.",
    Component: () => <TraceWaterfall spans={[]} totalMs={0} visibleCount={0} />,
  },
  {
    key: "long-content",
    label: "Deep trace",
    note: "Deep nesting, long span names, and very short spans in a long run.",
    Component: () => (
      <TraceWaterfall
        spans={[
          {
            id: "a",
            name: "agent.run",
            depth: 0,
            startMs: 0,
            durationMs: 48_210,
            status: "completed",
          },
          {
            id: "b",
            name: "anthropic.messages.create",
            depth: 1,
            startMs: 12,
            durationMs: 6_840,
            status: "completed",
          },
          {
            id: "c",
            name: "tool.github.search_issues",
            depth: 1,
            startMs: 6_870,
            durationMs: 1_204,
            status: "completed",
          },
          {
            id: "d",
            name: "http.request GET api.github.com/search/issues",
            depth: 2,
            startMs: 6_890,
            durationMs: 1_150,
            status: "completed",
          },
          {
            id: "e",
            name: "dns.lookup",
            depth: 3,
            startMs: 6_891,
            durationMs: 4,
            status: "completed",
          },
          {
            id: "f",
            name: "tool.code_interpreter.execute",
            depth: 1,
            startMs: 8_100,
            durationMs: 31_600,
            status: "completed",
          },
          {
            id: "g",
            name: "sandbox.pip_install pandas pyarrow",
            depth: 2,
            startMs: 8_140,
            durationMs: 22_480,
            status: "completed",
          },
          {
            id: "h",
            name: "anthropic.messages.create",
            depth: 1,
            startMs: 39_720,
            durationMs: 8_490,
            status: "completed",
          },
        ]}
        totalMs={48_210}
        visibleCount={8}
      />
    ),
  },
]);
