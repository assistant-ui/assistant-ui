"use client";

import {
  EmptyState,
  EmptyStateComposer,
  EmptyStateGreeting,
  EmptyStateSuggestion,
  EmptyStateSuggestions,
} from "@/components/assistant-ui/elements/empty-state";

const SUGGESTIONS = [
  "Explain this repo",
  "Find a bug",
  "Write a migration",
] as const;

export function EmptyStateDemo() {
  return (
    <EmptyState>
      <EmptyStateGreeting>What are we building?</EmptyStateGreeting>
      <EmptyStateSuggestions>
        {SUGGESTIONS.map((suggestion, i) => (
          <EmptyStateSuggestion key={suggestion} index={i}>
            {suggestion}
          </EmptyStateSuggestion>
        ))}
      </EmptyStateSuggestions>
      <EmptyStateComposer placeholder="Ask anything" onSend={() => undefined} />
    </EmptyState>
  );
}
