"use client";

import { useMemo } from "react";
import {
  StreamingText,
  type Segment,
} from "@/components/elements/streaming-text";
import { useWordStream } from "./use-demo";

const SEGMENTS: Segment[] = [
  { text: "Here is what changed in the latest release: the composer now" },
  { text: "restores drafts per thread, tool calls stream partial arguments" },
  { text: "through" },
  { text: "useAuiState", mono: true },
  { text: "selectors, and reasoning traces collapse on their own the moment" },
  { text: "a reply starts streaming." },
];

export function StreamingTextDemo() {
  const text = useMemo(
    () => SEGMENTS.map((segment) => segment.text).join(" "),
    [],
  );
  const { count, streaming } = useWordStream(text, {
    interval: 88,
  });

  return (
    <StreamingText segments={SEGMENTS} count={count} streaming={streaming} />
  );
}
