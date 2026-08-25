"use client";

import { TerminalBlock } from "@/components/elements/terminal-block";
import { useStoryPhases } from "@/components/demo/use-demo";

const LINES = [
  "RUN v4.0.5 /apps/docs",
  "✓ composer restores draft on switch (12ms)",
  "✓ composer clears draft after send (9ms)",
  "✓ composer keeps attachments per thread (11ms)",
  "Tests 3 passed (3)",
] as const;

const PHASES = [700, 700, 700, 700, 700, 2500] as const;

function TerminalBlockStory({ variant }: { variant: "paper" | "ink" }) {
  const { phase } = useStoryPhases(PHASES);
  const done = phase >= LINES.length;
  const visibleCount = Math.min(phase + 1, LINES.length);

  return (
    <TerminalBlock
      command="pnpm vitest run composer"
      lines={LINES}
      visibleCount={visibleCount}
      done={done}
      variant={variant}
    />
  );
}

export function TerminalBlockDemo() {
  return <TerminalBlockStory variant="paper" />;
}

export function TerminalBlockInkDemo() {
  return <TerminalBlockStory variant="ink" />;
}
