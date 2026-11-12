"use client";

import {
  ContextBreakdown,
  type ContextSegment,
} from "@/components/assistant-ui/elements/context-breakdown";
import { defineStates } from "./types";

const segments = (
  conversation: number,
  files: number,
): readonly ContextSegment[] => [
  { label: "System prompt", tokens: 1_800, tint: "bg-foreground/45" },
  { label: "Tools", tokens: 4_200, tint: "bg-foreground/25" },
  {
    label: "Attached files",
    tokens: files,
    tint: "bg-blue-500/60 dark:bg-blue-400/60",
  },
  {
    label: "Conversation",
    tokens: conversation,
    tint: "bg-blue-500 dark:bg-blue-400",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Fresh thread",
    note: "Before the first message only the prompt and tools use space.",
    Component: () => (
      <ContextBreakdown segments={segments(0, 0)} limit={128_000} />
    ),
  },
  {
    key: "warning",
    label: "Near limit",
    note: "Past 85 percent of the window the total turns amber.",
    Component: () => (
      <ContextBreakdown segments={segments(78_200, 38_500)} limit={128_000} />
    ),
  },
  {
    key: "overflow",
    label: "Over limit",
    note: "Usage passed the window, so headroom reads zero.",
    Component: () => (
      <ContextBreakdown segments={segments(94_600, 38_500)} limit={128_000} />
    ),
  },
]);
