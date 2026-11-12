"use client";

import {
  EmptyState,
  EmptyStateComposer,
  EmptyStateGreeting,
  EmptyStateSuggestion,
  EmptyStateSuggestions,
} from "@/components/assistant-ui/elements/empty-state";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "no-suggestions",
    label: "No suggestions",
    note: "Only the greeting and composer, with no starter prompts.",
    Component: () => (
      <EmptyState>
        <EmptyStateGreeting>What are we building?</EmptyStateGreeting>
        <EmptyStateComposer placeholder="Ask anything" onSend={noop} />
      </EmptyState>
    ),
  },
  {
    key: "disabled",
    label: "Send disabled",
    note: "Without a send handler the send button is disabled.",
    Component: () => (
      <EmptyState>
        <EmptyStateGreeting>What are we building?</EmptyStateGreeting>
        <EmptyStateSuggestions>
          {["Explain this repo", "Find a bug", "Write a migration"].map(
            (suggestion, i) => (
              <EmptyStateSuggestion key={suggestion} index={i} disabled>
                {suggestion}
              </EmptyStateSuggestion>
            ),
          )}
        </EmptyStateSuggestions>
        <EmptyStateComposer placeholder="Ask anything" />
      </EmptyState>
    ),
  },
  {
    key: "many-suggestions",
    label: "Many prompts",
    note: "Longer and more numerous suggestions wrap onto several rows.",
    Component: () => (
      <EmptyState>
        <EmptyStateGreeting>
          Good morning, Harry. Where do we start?
        </EmptyStateGreeting>
        <EmptyStateSuggestions>
          {[
            "Explain this repo",
            "Find why the converter drops empty parts",
            "Write a migration for 0.14",
            "Summarize yesterday's PRs",
            "Add a regression test",
            "Review my open diff",
          ].map((suggestion, i) => (
            <EmptyStateSuggestion key={suggestion} index={i}>
              {suggestion}
            </EmptyStateSuggestion>
          ))}
        </EmptyStateSuggestions>
        <EmptyStateComposer placeholder="Ask anything" onSend={noop} />
      </EmptyState>
    ),
  },
]);
