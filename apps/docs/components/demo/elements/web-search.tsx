"use client";

import {
  WebSearch,
  type WebSearchResult,
} from "@/components/assistant-ui/elements/web-search";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const QUERY = "assistant-ui draft persistence";
const RESULTS: readonly WebSearchResult[] = [
  {
    title: "Persisting composer state across threads",
    domain: "assistant-ui.com",
  },
  {
    title: "Draft autosave patterns in chat UIs",
    domain: "patterns.dev",
  },
  {
    title: "useSyncExternalStore and derived state",
    domain: "react.dev",
  },
];

const PHASES = [1800, 500, 500, 500, 3000] as const;

export function WebSearchDemo() {
  const { phase } = useStoryPhases(PHASES);
  const visibleResults = Math.min(phase, RESULTS.length);
  const searching = phase < RESULTS.length + 1;

  return (
    <WebSearch
      query={QUERY}
      results={RESULTS}
      visibleResults={visibleResults}
      searching={searching}
      cycle={0}
    />
  );
}
