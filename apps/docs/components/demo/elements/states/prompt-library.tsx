"use client";

import {
  PromptLibrary,
  type SavedPrompt,
} from "@/components/assistant-ui/elements/prompt-library";
import { defineStates } from "./types";

const noop = () => {};

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

const LONG_PROMPT: SavedPrompt = {
  id: "4",
  name: "Draft a customer incident report for the enterprise support channel",
  body: "Write an incident report for {customer} covering the outage on {date}. Start with impact in one sentence, then the timeline from {start_time} to {end_time}, the root cause in plain words, and what {team} is changing so it does not happen again. Keep it under 300 words and avoid internal service names.",
  variables: ["customer", "date", "start_time", "end_time", "team"],
};

const handlers = { onQueryChange: noop, onSelect: noop, onInsert: noop };

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filtered",
    label: "Filtered",
    note: "A query narrows the list and previews the selected match.",
    Component: () => (
      <PromptLibrary
        prompts={PROMPTS}
        query="write"
        selectedId="2"
        {...handlers}
      />
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "No saved prompt matches the search.",
    Component: () => (
      <PromptLibrary
        prompts={PROMPTS}
        query="deploy checklist"
        selectedId="1"
        {...handlers}
      />
    ),
  },
  {
    key: "no-selection",
    label: "No selection",
    note: "The selected prompt was filtered out, so no preview shows.",
    Component: () => (
      <PromptLibrary prompts={PROMPTS} query="e" selectedId="9" {...handlers} />
    ),
  },
  {
    key: "long-content",
    label: "Long prompt",
    note: "A long name truncates and a long body wraps with many variables.",
    Component: () => (
      <PromptLibrary
        prompts={[LONG_PROMPT, ...PROMPTS]}
        query=""
        selectedId="4"
        {...handlers}
      />
    ),
  },
]);
