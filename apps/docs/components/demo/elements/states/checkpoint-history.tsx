"use client";

import {
  CheckpointHistory,
  type Checkpoint,
} from "@/components/assistant-ui/elements/checkpoint-history";
import { defineStates } from "./types";

const noop = () => {};

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "1", label: "Before the converter change", at: "09:41", files: 0 },
  { id: "2", label: "Converter guarded", at: "09:58", files: 2 },
  { id: "3", label: "Tests added", at: "10:12", files: 4 },
  { id: "4", label: "Formatting sweep", at: "10:20", files: 31 },
];

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
