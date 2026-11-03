"use client";

import {
  MemoryChips,
  type MemoryChip,
} from "@/components/assistant-ui/elements/memory-chips";
import { defineStates } from "./types";

const noop = () => {};

const EXISTING: readonly MemoryChip[] = [
  { id: "1", text: "Prefers TypeScript", change: "existing" },
  { id: "2", text: "Works in a pnpm monorepo", change: "existing" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "existing-only",
    label: "Nothing new",
    note: "The turn wrote no memory, so only what was already known shows.",
    Component: () => <MemoryChips chips={EXISTING} onForget={noop} />,
  },
  {
    key: "updated",
    label: "Updated",
    note: "A stored memory was rewritten during the turn and counts as new.",
    Component: () => (
      <MemoryChips
        chips={[
          ...EXISTING,
          { id: "3", text: "Deploys on Vercel, not Fly", change: "updated" },
        ]}
        onForget={noop}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a forget handler the chips cannot be removed.",
    Component: () => (
      <MemoryChips
        chips={[
          ...EXISTING,
          { id: "3", text: "Ships with changesets", change: "added" },
        ]}
      />
    ),
  },
  {
    key: "empty",
    label: "Empty",
    note: "Nothing is remembered yet, so only the header shows.",
    Component: () => <MemoryChips chips={[]} onForget={noop} />,
  },
  {
    key: "long-content",
    label: "Many memories",
    note: "Many chips, some long, wrap across several rows.",
    Component: () => (
      <MemoryChips
        chips={[
          ...EXISTING,
          { id: "3", text: "Ships with changesets", change: "existing" },
          {
            id: "4",
            text: "Wants PR descriptions under five lines with a test plan",
            change: "added",
          },
          { id: "5", text: "Based in San Francisco", change: "existing" },
          {
            id: "6",
            text: "Uses Vitest with jsdom for component tests",
            change: "updated",
          },
          { id: "7", text: "Reviews before merging", change: "existing" },
          { id: "8", text: "Avoids default exports", change: "added" },
        ]}
        onForget={noop}
      />
    ),
  },
]);
