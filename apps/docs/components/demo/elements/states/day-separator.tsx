"use client";

import {
  DaySeparator,
  type DatedMessage,
} from "@/components/assistant-ui/elements/day-separator";
import { defineStates } from "./types";

const SAME_DAY: readonly DatedMessage[] = [
  {
    id: "1",
    day: "Today",
    time: "09:12",
    role: "user",
    text: "Why does the draft survive a reload?",
  },
  {
    id: "2",
    day: "Today",
    time: "09:12",
    role: "assistant",
    text: "It's persisted per thread, so the slot is read back on mount.",
  },
];

const MANY_DAYS: readonly DatedMessage[] = [
  {
    id: "1",
    day: "Mon, Oct 27",
    time: "11:40",
    role: "user",
    text: "Start a migration plan for moving the docs to the new MDX pipeline.",
  },
  {
    id: "2",
    day: "Mon, Oct 27",
    time: "11:41",
    role: "assistant",
    text: "Drafted a four-step plan: inventory pages, port components, switch the build, then redirect old URLs.",
  },
  {
    id: "3",
    day: "Thu, Oct 30",
    time: "17:05",
    role: "user",
    text: "Step two is done. https://github.com/assistant-ui/assistant-ui/pull/2481/files#diff-apps-docs-components-mdx-components-tsx",
  },
  {
    id: "4",
    day: "Yesterday",
    time: "08:58",
    role: "assistant",
    text: "The build switch landed. Two pages still import the old callout component.",
  },
  {
    id: "5",
    day: "Today",
    time: "09:12",
    role: "user",
    text: "Fix those two and we can redirect.",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "same-day",
    label: "One day",
    note: "A thread from a single day shows one separator at the top.",
    Component: () => <DaySeparator messages={SAME_DAY} />,
  },
  {
    key: "long-content",
    label: "Many days",
    note: "A week-long thread with dated separators and a long unbroken URL that wraps.",
    Component: () => <DaySeparator messages={MANY_DAYS} />,
  },
]);
