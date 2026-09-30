import {
  ComparisonCard,
  type ComparisonOption,
} from "@assistant-ui/ui/components/assistant-ui/elements/comparison-card.tsx";
import { defineSections } from "../types";

const TRAITS = ["Streaming", "Multi-thread", "No backend"] as const;

const OPTIONS: readonly ComparisonOption[] = [
  {
    id: "local",
    name: "Local runtime",
    headline: "vscode.lm in the host",
    traits: ["Streams", "Multi-thread", "No backend"],
  },
  {
    id: "ai-sdk",
    name: "AI SDK",
    headline: "Route handler over the bridge",
    traits: ["Streams", "Multi-thread", false],
  },
];

export default defineSections([
  {
    id: "comparison-card",
    title: "Comparison card",
    category: "content",
    notes: "Two options, one recommended with a reason.",
    render: () => (
      <ComparisonCard
        traitLabels={TRAITS}
        options={OPTIONS}
        recommendedId="local"
        reason="The extension already has vscode.lm, so the local runtime needs no route handler and no API key."
      />
    ),
  },
]);
