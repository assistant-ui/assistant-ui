import { useState } from "react";
import {
  PromptLibrary,
  type SavedPrompt,
} from "@assistant-ui/ui/components/assistant-ui/elements/prompt-library.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const PROMPTS: readonly SavedPrompt[] = [
  {
    id: "1",
    name: "Review this PR",
    body: "Review {branch} against the repo conventions. Judge whether it should exist before checking correctness.",
    variables: ["branch"],
  },
  {
    id: "2",
    name: "Write a changeset",
    body: "Write a patch changeset for {package} in lowercase, one line.",
    variables: ["package"],
  },
  {
    id: "3",
    name: "Explain this file",
    body: "Explain what this file does and which invariants it protects.",
    variables: [],
  },
];

function InteractiveLibrary({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState("1");
  return (
    <PromptLibrary
      prompts={PROMPTS}
      query={query}
      selectedId={selectedId}
      onQueryChange={setQuery}
      onSelect={setSelectedId}
      onInsert={setSelectedId}
    />
  );
}

export default defineSections([
  {
    id: "prompt-library",
    title: "Prompt library",
    category: "agents",
    notes: "Saved prompts with variables; search filters, a row selects.",
    render: () => (
      <States>
        <State label="all prompts">
          <InteractiveLibrary initialQuery="" />
        </State>
        <State label="no match">
          <InteractiveLibrary initialQuery="deploy to production" />
        </State>
      </States>
    ),
  },
]);
