"use client";

import {
  SpecSheet,
  type SpecRow,
} from "@/components/assistant-ui/elements/spec-sheet";
import { defineStates } from "./types";

const ROWS: readonly SpecRow[] = [
  { label: "context", value: "1,000,000 tokens" },
  { label: "input", value: "$4.00 / M" },
  { label: "output", value: "$20.00 / M" },
  { label: "vision", value: "yes" },
  { label: "knowledge", value: "May 2026" },
  { label: "best for", value: "Long agentic runs", emphasis: true },
];

const LONG_ROWS: readonly SpecRow[] = [
  { label: "endpoint", value: "https://api.anthropic.com/v1/messages" },
  {
    label: "regions",
    value: "us-east-1, us-west-2, eu-west-1, eu-central-1, ap-northeast-1",
  },
  {
    label: "rate limit",
    value: "4,000 requests / min, 2,000,000 tokens / min",
  },
  {
    label: "data retention period",
    value: "30 days, then deleted",
  },
  {
    label: "best for",
    value: "Batch summarization of long support transcripts overnight",
    emphasis: true,
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "loading",
    label: "No rows yet",
    note: "The title is in but no rows have streamed.",
    Component: () => (
      <SpecSheet
        title="Opus 5.5"
        subtitle="claude-opus-5-5"
        rows={ROWS}
        visibleCount={0}
      />
    ),
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "Three of six rows have arrived.",
    Component: () => (
      <SpecSheet
        title="Opus 5.5"
        subtitle="claude-opus-5-5"
        rows={ROWS}
        visibleCount={3}
      />
    ),
  },
  {
    key: "no-subtitle",
    label: "No subtitle",
    note: "A sheet with a title only and a short list of rows.",
    Component: () => (
      <SpecSheet
        title="MacBook Pro 14"
        rows={[
          { label: "chip", value: "M5 Pro" },
          { label: "memory", value: "36 GB" },
          { label: "price", value: "$2,399", emphasis: true },
        ]}
        visibleCount={3}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long values",
    note: "Long labels and values wrap instead of pushing the card wider.",
    Component: () => (
      <SpecSheet
        title="Message Batches API"
        subtitle="Production workspace, Tier 4"
        rows={LONG_ROWS}
        visibleCount={LONG_ROWS.length}
      />
    ),
  },
]);
