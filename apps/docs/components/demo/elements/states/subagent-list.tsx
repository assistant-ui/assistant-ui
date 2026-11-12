"use client";

import {
  SubagentList,
  type SubagentItem,
} from "@/components/assistant-ui/elements/subagent-list";
import { defineStates } from "./types";

const AGENTS: readonly SubagentItem[] = [
  { name: "Explore the runtime", model: "haiku" },
  { name: "Fix composer types", model: "sonnet" },
  { name: "Write regression tests", model: "sonnet" },
];

const SUMMARY: SubagentItem = { name: "Summarize findings", model: "haiku" };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "starting",
    label: "Starting",
    note: "All workers just launched and none has made progress.",
    Component: () => (
      <SubagentList
        agents={AGENTS}
        completedCount={0}
        progress={[0, 0, 0]}
        showSummary={false}
        summaryAgent={SUMMARY}
      />
    ),
  },
  {
    key: "partial",
    label: "Partly done",
    note: "One worker finished while the others are still running.",
    Component: () => (
      <SubagentList
        agents={AGENTS}
        completedCount={1}
        progress={[100, 62, 35]}
        showSummary={false}
        summaryAgent={SUMMARY}
      />
    ),
  },
  {
    key: "summarizing",
    label: "Summarizing",
    note: "Every worker finished and the summary agent is combining their results.",
    Component: () => (
      <SubagentList
        agents={AGENTS}
        completedCount={3}
        progress={[100, 100, 100]}
        showSummary
        summaryAgent={SUMMARY}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long names",
    note: "Long worker names truncate and many workers stack in one column.",
    Component: () => (
      <SubagentList
        agents={[
          {
            name: "Audit every runtime adapter for missing thread list methods",
            model: "sonnet",
          },
          {
            name: "Regenerate the API reference for @assistant-ui/react",
            model: "haiku",
          },
          { name: "Check the docs for broken internal links", model: "haiku" },
          {
            name: "Port the composer tests from Jest to Vitest",
            model: "sonnet",
          },
          { name: "Benchmark the markdown renderer", model: "opus" },
        ]}
        completedCount={2}
        progress={[100, 100, 74, 40, 12]}
        showSummary={false}
        summaryAgent={SUMMARY}
      />
    ),
  },
]);
