import {
  EmptyState,
  EmptyStateComposer,
  EmptyStateGreeting,
  EmptyStateSuggestion,
  EmptyStateSuggestions,
} from "@assistant-ui/ui/components/assistant-ui/elements/empty-state.tsx";
import { defineSections } from "../types";

const SUGGESTIONS = [
  "Explain this repo",
  "Find a bug",
  "Write a migration",
] as const;

export default defineSections([
  {
    id: "empty-state",
    title: "Empty state",
    category: "chat",
    notes: "empty-state.tsx (standalone): greeting, suggestions and composer.",
    render: () => (
      <EmptyState>
        <EmptyStateGreeting>What are we building?</EmptyStateGreeting>
        <EmptyStateSuggestions>
          {SUGGESTIONS.map((suggestion, i) => (
            <EmptyStateSuggestion key={suggestion} index={i}>
              {suggestion}
            </EmptyStateSuggestion>
          ))}
        </EmptyStateSuggestions>
        <EmptyStateComposer placeholder="Ask anything" onSend={() => {}} />
      </EmptyState>
    ),
  },
]);
