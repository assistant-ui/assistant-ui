"use client";

import { CheckpointHistory } from "@/components/assistant-ui/elements/checkpoint-history";
import { CHECKPOINTS } from "../checkpoint-history";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "latest",
    label: "At latest",
    note: "The current state is the newest checkpoint, so nothing is ahead.",
    Component: () => (
      <CheckpointHistory
        checkpoints={CHECKPOINTS}
        currentId="4"
        onRestore={noop}
      />
    ),
  },
  {
    key: "restored",
    label: "Restored",
    note: "The user rolled back to the first checkpoint and later ones are dimmed.",
    Component: () => (
      <CheckpointHistory
        checkpoints={CHECKPOINTS}
        currentId="1"
        onRestore={noop}
      />
    ),
  },
  {
    key: "single",
    label: "One checkpoint",
    note: "Only the starting point exists so far.",
    Component: () => (
      <CheckpointHistory
        checkpoints={CHECKPOINTS.slice(0, 1)}
        currentId="1"
        onRestore={noop}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a restore handler the history is display only.",
    Component: () => (
      <CheckpointHistory checkpoints={CHECKPOINTS} currentId="3" />
    ),
  },
  {
    key: "long-content",
    label: "Long labels",
    note: "Long checkpoint labels truncate on one line.",
    Component: () => (
      <CheckpointHistory
        onRestore={noop}
        currentId="b"
        checkpoints={[
          {
            id: "a",
            label: "Before migrating the thread list to the remote adapter",
            at: "Yesterday 17:05",
            files: 0,
          },
          {
            id: "b",
            label:
              "Remote adapter wired behind the feature flag with optimistic renames",
            at: "Yesterday 18:40",
            files: 12,
          },
          {
            id: "c",
            label: "Backfill script and per-workspace count verification",
            at: "Today 09:15",
            files: 1284,
          },
        ]}
      />
    ),
  },
]);
