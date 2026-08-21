"use client";

import { useState } from "react";
import { ToolGroup, type GroupedTool } from "@/components/elements/tool-group";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const TOOLS: readonly GroupedTool[] = [
  {
    id: "a",
    name: "read_file",
    target: "packages/core/src/convertMessages.ts",
    state: "done",
    durationMs: 42,
  },
  {
    id: "b",
    name: "read_file",
    target: "packages/ui/src/composer.tsx",
    state: "done",
    durationMs: 38,
  },
  {
    id: "c",
    name: "grep",
    target: "useDraft",
    state: "done",
    durationMs: 61,
  },
  {
    id: "d",
    name: "read_file",
    target: "packages/core/src/queue/message-queue.ts",
    state: "running",
  },
];

const PHASES = [2400, 0] as const;

export function ToolGroupDemo() {
  const { phase } = useStoryPhases(PHASES);
  const [open, setOpen] = useState(true);

  const tools =
    phase === 0
      ? TOOLS
      : TOOLS.map((tool) =>
          tool.state === "running"
            ? { ...tool, state: "done" as const, durationMs: 55 }
            : tool,
        );

  return (
    <ToolGroup
      label="Read 4 files in parallel"
      tools={tools}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
