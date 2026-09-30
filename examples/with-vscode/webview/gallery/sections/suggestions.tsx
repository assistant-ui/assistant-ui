import { useState } from "react";
import { Suggestions } from "@assistant-ui/ui/components/assistant-ui/elements/suggestions.tsx";
import { defineSections } from "../types";

const SUGGESTIONS = [
  "Add optimistic updates",
  "Show me the diff",
  "Why not React context?",
  "Write a regression test",
];

function SuggestionsExample({ variant }: { variant: "pills" | "list" }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Suggestions
      suggestions={SUGGESTIONS}
      selectedSuggestion={selected}
      cycle={0}
      onSuggestion={setSelected}
      variant={variant}
    />
  );
}

export default defineSections([
  {
    id: "suggestions",
    title: "Suggestions (pills)",
    category: "chat",
    notes: "suggestions.tsx (standalone).",
    render: () => <SuggestionsExample variant="pills" />,
  },
  {
    id: "suggestions-list",
    title: "Suggestions (list)",
    category: "chat",
    render: () => <SuggestionsExample variant="list" />,
  },
]);
