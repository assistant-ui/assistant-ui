"use client";

import { useState } from "react";
import {
  CheckpointHistory,
  type Checkpoint,
} from "@/components/assistant-ui/elements/checkpoint-history";

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "1", label: "Before the converter change", at: "09:41", files: 0 },
  { id: "2", label: "Converter guarded", at: "09:58", files: 2 },
  { id: "3", label: "Tests added", at: "10:12", files: 4 },
  { id: "4", label: "Formatting sweep", at: "10:20", files: 31 },
];

export function CheckpointHistoryDemo() {
  const [currentId, setCurrentId] = useState("3");

  return (
    <CheckpointHistory
      checkpoints={CHECKPOINTS}
      currentId={currentId}
      onRestore={setCurrentId}
    />
  );
}
