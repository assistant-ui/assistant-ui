"use client";

import { useState } from "react";
import { ToolCall } from "@/components/elements/tool-call";
import { useStoryPhases } from "./use-demo";

const PHASES = [2200, 1400, 3000, 0] as const;

export function ToolCallDemo() {
  const { phase, running, takeOver } = useStoryPhases(PHASES);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);

  const open = running ? phase === 2 : (userOpen ?? false);

  return (
    <ToolCall
      label="Searched the docs"
      activeLabel="Searching the docs"
      query="draft persistence"
      request={'{"query": "draft persistence"}'}
      result="3 matches, best hit /docs/runtime/drafts"
      running={running && phase === 0}
      open={open}
      onOpenChange={(next) => {
        takeOver();
        setUserOpen(next);
      }}
    />
  );
}
