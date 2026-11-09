"use client";

import {
  WebSearch,
  type WebSearchResult,
} from "@/components/assistant-ui/elements/web-search";
import { defineStates } from "./types";

const QUERY = "assistant-ui draft persistence";
const RESULTS: readonly WebSearchResult[] = [
  {
    title: "Persisting composer state across threads",
    domain: "assistant-ui.com",
  },
  { title: "Draft autosave patterns in chat UIs", domain: "patterns.dev" },
  { title: "useSyncExternalStore and derived state", domain: "react.dev" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "searching",
    label: "Searching",
    note: "The query is sent and no result has come back yet.",
    Component: () => (
      <WebSearch
        query={QUERY}
        results={RESULTS}
        visibleResults={0}
        searching
        cycle={0}
      />
    ),
  },
  {
    key: "partial",
    label: "Partial",
    note: "Two results have landed while the search is still running.",
    Component: () => (
      <WebSearch
        query={QUERY}
        results={RESULTS}
        visibleResults={2}
        searching
        cycle={0}
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "The search finished with every source read.",
    Component: () => (
      <WebSearch
        query={QUERY}
        results={RESULTS}
        visibleResults={RESULTS.length}
        searching={false}
        cycle={0}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long titles",
    note: "A long query wraps and long result titles truncate inside the same width.",
    Component: () => (
      <WebSearch
        query="how to keep a composer draft when a remote thread reloads in assistant-ui"
        results={[
          {
            title:
              "Persisting composer drafts across reloads with a remote thread list adapter",
            domain: "assistant-ui.com",
          },
          {
            title:
              "Autosave, restore, and conflict handling for unsent messages in chat interfaces",
            domain: "smashingmagazine.com",
          },
          {
            title:
              "Synchronizing external stores with React using useSyncExternalStore",
            domain: "react.dev",
          },
        ]}
        visibleResults={3}
        searching={false}
        cycle={0}
      />
    ),
  },
]);
