import { useState } from "react";
import {
  MemoryChips,
  type MemoryChip,
} from "@assistant-ui/ui/components/assistant-ui/elements/memory-chips.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const CHIPS: readonly MemoryChip[] = [
  { id: "1", text: "Prefers TypeScript", change: "existing" },
  { id: "2", text: "Works in a pnpm monorepo", change: "existing" },
  { id: "3", text: "Ships with changesets", change: "added" },
  {
    id: "4",
    text: "Reviews before merging, and wants a second reviewer on runtime changes",
    change: "updated",
  },
];

function InteractiveChips() {
  const [chips, setChips] = useState(CHIPS);
  return (
    <MemoryChips
      chips={chips}
      onForget={(id) =>
        setChips((current) => current.filter((chip) => chip.id !== id))
      }
    />
  );
}

export default defineSections([
  {
    id: "memory-chips",
    title: "Memory chips",
    category: "agents",
    notes: "Existing, added and updated memories; forget removes one.",
    render: () => (
      <States>
        <State label="interactive">
          <InteractiveChips />
        </State>
        <State label="read-only">
          <MemoryChips chips={CHIPS.slice(0, 2)} />
        </State>
      </States>
    ),
  },
]);
