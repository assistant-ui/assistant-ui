"use client";

import { ArtifactCard } from "@/components/assistant-ui/elements/artifact-card";
import { useElapsed, useStoryPhases } from "@/components/demo/hooks/use-demo";

const PHASES = [3200, 2800] as const;
const MAX_WORDS = 214;

export function ArtifactCardDemo() {
  const { phase } = useStoryPhases(PHASES);
  const generating = phase === 0;
  const tenths = useElapsed(generating);
  const words = Math.min(MAX_WORDS, Math.floor((tenths * MAX_WORDS) / 32));

  return (
    <ArtifactCard
      title="Draft persistence RFC"
      meta="Document · v3 · just now"
      generating={generating}
      words={words}
    />
  );
}
