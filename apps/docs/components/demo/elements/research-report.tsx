"use client";

import {
  ResearchReport,
  type ReportSection,
} from "@/components/elements/research-report";
import { useStoryPhases } from "@/components/demo/hooks/use-demo";

const HEADINGS = [
  "What changed in 0.14",
  "Who is affected",
  "Migration path",
  "Open questions",
] as const;

const PREVIEWS = [
  "Drafts moved from parent state into a per-thread slot owned by the composer.",
  "Anyone mirroring the draft in their own useState reads a value that never updates.",
  "Replace the mirror with useDraft(threadId) and delete the hydrate effect.",
] as const;

const PHASES = [1100, 1100, 1100, 0] as const;

export function ResearchReportDemo() {
  const { phase } = useStoryPhases(PHASES);

  const sections: ReportSection[] = HEADINGS.map((heading, i) => ({
    id: heading,
    heading,
    state: i < phase ? "done" : i === phase ? "writing" : "pending",
    sources: i < phase ? 4 - i : 0,
    ...(i < phase && PREVIEWS[i] ? { preview: PREVIEWS[i] } : {}),
  }));

  return (
    <ResearchReport
      title="Draft ownership in 0.14"
      sections={sections}
      sourcesRead={9 + phase * 3}
    />
  );
}
