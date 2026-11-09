"use client";

import {
  StreamingText,
  type Segment,
} from "@/components/assistant-ui/elements/streaming-text";
import { defineStates } from "./types";

const SEGMENTS: Segment[] = [
  { text: "Here is what changed in the latest release: the composer now" },
  { text: "restores drafts per thread, tool calls stream partial arguments" },
  { text: "through" },
  { text: "useAuiState", mono: true },
  { text: "selectors, and reasoning traces collapse on their own the moment" },
  { text: "a reply starts streaming." },
];

const WORDS = SEGMENTS.reduce(
  (total, segment) => total + segment.text.split(" ").length,
  0,
);

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "Halfway through the reply, with the newest words still in blue.",
    Component: () => <StreamingText segments={SEGMENTS} count={17} streaming />,
  },
  {
    key: "success",
    label: "Complete",
    note: "The stream ended, so every word has settled and the caret is gone.",
    Component: () => (
      <StreamingText segments={SEGMENTS} count={WORDS} streaming={false} />
    ),
  },
]);
