"use client";

import { useState } from "react";
import { Suggestions } from "@/components/elements/suggestions";

const SUGGESTIONS = [
  "Add optimistic updates",
  "Show me the diff",
  "Why not React context?",
  "Write a regression test",
];

function SuggestionsStory({ variant }: { variant: "pills" | "list" }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null,
  );

  return (
    <Suggestions
      suggestions={SUGGESTIONS}
      selectedSuggestion={selectedSuggestion}
      cycle={0}
      onSuggestion={setSelectedSuggestion}
      variant={variant}
    />
  );
}

export function SuggestionsDemo() {
  return <SuggestionsStory variant="pills" />;
}

export function SuggestionsListDemo() {
  return <SuggestionsStory variant="list" />;
}
