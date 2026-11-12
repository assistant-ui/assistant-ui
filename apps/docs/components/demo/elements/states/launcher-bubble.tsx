"use client";

import { LauncherBubble } from "@/components/assistant-ui/elements/launcher-bubble";
import { defineStates } from "./types";

const noop = () => {};

const PROMPTS = [
  "How do I add a thread list?",
  "What changed in 0.14?",
  "Show me an external store example",
];

const base = {
  greeting: "Need a hand with assistant-ui?",
  prompts: PROMPTS,
  onToggle: noop,
  onPick: noop,
  onStart: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "closed",
    label: "Closed",
    note: "Collapsed to the bubble with nothing unread.",
    Component: () => <LauncherBubble {...base} open={false} unread={0} />,
  },
  {
    key: "unread",
    label: "Unread",
    note: "Collapsed with a badge counting unread replies.",
    Component: () => <LauncherBubble {...base} open={false} unread={3} />,
  },
  {
    key: "open",
    label: "Open",
    note: "Expanded with starter prompts and a start button.",
    Component: () => <LauncherBubble {...base} open unread={0} />,
  },
  {
    key: "no-prompts",
    label: "No prompts",
    note: "Expanded with only the greeting and the start button.",
    Component: () => <LauncherBubble {...base} open unread={0} prompts={[]} />,
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without handlers the prompts are static and the start button is gone.",
    Component: () => (
      <LauncherBubble
        open
        unread={0}
        greeting="Need a hand with assistant-ui?"
        prompts={PROMPTS}
      />
    ),
  },
]);
