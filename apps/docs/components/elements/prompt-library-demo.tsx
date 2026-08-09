"use client";

import { useState } from "react";
import {
  PromptLibrary,
  type SavedPrompt,
} from "@/components/elements/prompt-library";

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

export function PromptLibraryDemo() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("1");

  return (
    <PromptLibrary
      prompts={PROMPTS}
      query={query}
      selectedId={selectedId}
      onQueryChange={setQuery}
      onSelect={setSelectedId}
    />
  );
}
