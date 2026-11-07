"use client";

import { DraftRestore } from "@/components/assistant-ui/elements/draft-restore";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Empty draft",
    note: "An empty draft leaves the preview line blank above the saved time.",
    Component: () => (
      <DraftRestore
        draft=""
        savedAt="2 min ago"
        onRestore={noop}
        onDiscard={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long draft",
    note: "A draft longer than the card truncates to one line.",
    Component: () => (
      <DraftRestore
        draft="Can you go through the failing checkout tests on the release branch, figure out which ones broke after the payment provider migration, and propose a fix for each one before Thursday's cut?"
        savedAt="yesterday"
        onRestore={noop}
        onDiscard={noop}
      />
    ),
  },
  {
    key: "multi-line",
    label: "Multi-line",
    note: "A draft with line breaks collapses into a single preview line.",
    Component: () => (
      <DraftRestore
        draft={
          "Steps to reproduce:\n1. Open a thread\n2. Switch to another thread\n3. Come back"
        }
        savedAt="just now"
        onRestore={noop}
        onDiscard={noop}
      />
    ),
  },
]);
