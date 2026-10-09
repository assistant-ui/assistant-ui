"use client";

import { TerminalBlock } from "@/components/assistant-ui/elements/terminal-block";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

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

export function TerminalBlockFailedDemo() {
  return (
    <TerminalBlock
      cwd="~/assistant-ui"
      command="pnpm build"
      lines={[
        "\u001b[1mBuilding package\u001b[0m",
        "\u001b[2mChecking entrypoints\u001b[0m",
      ]}
      stderr={["Error: missing export from ./runtime"]}
      visibleCount={3}
      done
      exitCode={1}
      durationMs={1200}
    />
  );
}
