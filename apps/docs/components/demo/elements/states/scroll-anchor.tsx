"use client";

import {
  ScrollAnchor,
  type ScrollAnchorMessage,
} from "@/components/assistant-ui/elements/scroll-anchor";
import { defineStates } from "./types";

const SHORT: ScrollAnchorMessage[] = [
  { role: "user", text: "Why does the thread jump while streaming?" },
  {
    role: "assistant",
    text: "The viewport pins to the bottom only while you are already there.",
  },
];

const LONG: ScrollAnchorMessage[] = [
  {
    role: "user",
    text: "Can you walk me through how the viewport decides whether to follow new content, including what happens when an image loads late?",
  },
  {
    role: "assistant",
    text: "The viewport tracks whether you were at the bottom before each layout change. If you were, it scrolls to the new bottom after the change commits. A late image counts as a layout change, so it is handled the same way as new tokens. If you had scrolled up, nothing moves and the jump pill takes over once new content lands below the fold.",
  },
  {
    role: "user",
    text: "What about a code block that keeps growing horizontally?",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "short",
    label: "Short thread",
    note: "Fewer messages than the viewport holds, so nothing scrolls.",
    Component: () => <ScrollAnchor paused messages={SHORT} />,
  },
  {
    key: "long-content",
    label: "Long messages",
    note: "Messages taller than the viewport overflow under the top fade.",
    Component: () => <ScrollAnchor paused messages={LONG} />,
  },
]);
