import { useState } from "react";
import {
  CheckpointHistory,
  type Checkpoint,
} from "@assistant-ui/ui/components/assistant-ui/elements/checkpoint-history.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "1", label: "Before the converter change", at: "09:41", files: 0 },
  { id: "2", label: "Converter guarded", at: "09:58", files: 2 },
  { id: "3", label: "Tests added", at: "10:12", files: 4 },
  {
    id: "4",
    label: "Formatting sweep across every package in the monorepo",
    at: "10:20",
    files: 131,
  },
];

function InteractiveHistory() {
  const [currentId, setCurrentId] = useState("3");
  return (
    <CheckpointHistory
      checkpoints={CHECKPOINTS}
      currentId={currentId}
      onRestore={setCurrentId}
    />
  );
}

export default defineSections([
  {
    id: "checkpoint-history",
    title: "Checkpoint history",
    category: "agents",
    notes:
      "Restored to the third checkpoint; restore moves the current marker.",
    render: () => <InteractiveHistory />,
  },
  {
    id: "checkpoint-history-states",
    title: "Checkpoint history states",
    category: "agents",
    notes: "At the latest checkpoint, and read-only at the first.",
    render: () => (
      <States>
        <State label="latest">
          <CheckpointHistory
            checkpoints={CHECKPOINTS}
            currentId="4"
            onRestore={() => {}}
          />
        </State>
        <State label="read-only, first">
          <CheckpointHistory checkpoints={CHECKPOINTS} currentId="1" />
        </State>
      </States>
    ),
  },
]);
