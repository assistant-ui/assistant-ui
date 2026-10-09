"use client";

import {
  RetrievalChunks,
  type RetrievalChunk,
} from "@/components/assistant-ui/elements/retrieval-chunks";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const CHUNKS: readonly RetrievalChunk[] = [
  {
    id: "c1",
    source: "migration-0.14.md",
    locator: "§ 2",
    score: 0.91,
    text: "The composer owns its draft from 0.14 onward. Parent state that mirrored the draft is no longer read and should be removed.",
  },
  {
    id: "c2",
    source: "composer.tsx",
    locator: "L12–31",
    score: 0.84,
    text: "useDraft(threadId) subscribes to the per-thread draft slot and clears it when the thread changes.",
  },
  {
    id: "c3",
    source: "CHANGELOG.md",
    locator: "0.14.0",
    score: 0.62,
    text: "fix(react-lexical): clear stale drafts on thread switch.",
  },
];

const PHASES = [1400, 700, 700, 0] as const;

export function RetrievalChunksDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <RetrievalChunks
      query="how does draft restore work"
      chunks={CHUNKS}
      visibleCount={phase === 0 ? 0 : Math.min(phase, CHUNKS.length)}
      searching={phase === 0}
    />
  );
}
