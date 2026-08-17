"use client";

import {
  ComparisonCard,
  type ComparisonOption,
} from "@/components/elements/comparison-card";

const TRAITS = ["Streaming", "Multi-thread", "Self-hosted"] as const;

const OPTIONS: readonly ComparisonOption[] = [
  {
    id: "local",
    name: "Local runtime",
    headline: "You own the loop",
    traits: ["Streams", "Multi-thread", "Self-hosted"],
  },
  {
    id: "external",
    name: "External store",
    headline: "Your state is the source",
    traits: ["Streams", "Multi-thread", false],
  },
];

export function ComparisonCardDemo() {
  return (
    <ComparisonCard
      traitLabels={TRAITS}
      options={OPTIONS}
      recommendedId="local"
      reason="You already hold messages in your own store, but you want the runtime to drive streaming and branching, so the local runtime costs you less wiring."
    />
  );
}
