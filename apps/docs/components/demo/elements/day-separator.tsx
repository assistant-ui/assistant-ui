"use client";

import {
  DaySeparator,
  type DatedMessage,
} from "@/components/assistant-ui/elements/day-separator";

const MESSAGES: readonly DatedMessage[] = [
  {
    id: "1",
    day: "Yesterday",
    time: "16:04",
    role: "user",
    text: "Why does the draft survive a reload?",
  },
  {
    id: "2",
    day: "Yesterday",
    time: "16:04",
    role: "assistant",
    text: "It's persisted per thread, so the slot is read back on mount.",
  },
  {
    id: "3",
    day: "Today",
    time: "09:12",
    role: "user",
    text: "And across thread switches?",
  },
  {
    id: "4",
    day: "Today",
    time: "09:12",
    role: "assistant",
    text: "Each thread owns its own slot, so nothing leaks between them.",
  },
];

export function DaySeparatorDemo() {
  return <DaySeparator messages={MESSAGES} />;
}
