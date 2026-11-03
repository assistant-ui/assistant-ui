"use client";

import { ArtifactCard } from "@/components/assistant-ui/elements/artifact-card";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Writing",
    note: "The document is still being generated and counts words as it goes.",
    Component: () => (
      <ArtifactCard
        title="Draft persistence RFC"
        meta="Document · v3 · just now"
        generating
        words={128}
      />
    ),
  },
  {
    key: "starting",
    label: "Just started",
    note: "Generation began and no words are written yet.",
    Component: () => (
      <ArtifactCard
        title="Draft persistence RFC"
        meta="Document · v1 · just now"
        generating
        words={0}
      />
    ),
  },
  {
    key: "success",
    label: "Written",
    note: "A finished version with its type, version, and age.",
    Component: () => (
      <ArtifactCard
        title="Draft persistence RFC"
        meta="Document · v3 · 2 min ago"
      />
    ),
  },
  {
    key: "long-content",
    label: "Long title",
    note: "A long title truncates on one line while the meta wraps below it.",
    Component: () => (
      <ArtifactCard
        title="Migrating the thread list from local storage to the remote adapter"
        meta="Document · v14 · edited yesterday at 18:42 by Ana Ruiz"
      />
    ),
  },
]);
