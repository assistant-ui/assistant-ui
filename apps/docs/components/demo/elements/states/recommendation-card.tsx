"use client";

import type { ReactNode } from "react";
import { RecommendationCard } from "@/components/assistant-ui/elements/recommendation-card";
import { defineStates } from "./types";

const noop = () => {};

function Code({ children }: { children: ReactNode }) {
  return (
    <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
      {children}
    </span>
  );
}

const body = (
  <>
    Threads lose their draft on switch. Wiring <Code>runtime.drafts</Code> fixes
    it with <Code>3 lines</Code> and no migration.
  </>
);

const base = {
  question: "Enable draft autosave?",
  confidenceLabel: "high confidence",
  acceptedLabel: "Enabled for every thread",
  onAccept: noop,
  onAlternatives: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "requires-action",
    label: "Pending",
    note: "The proposal waits for the user to accept or ask for alternatives.",
    Component: () => (
      <RecommendationCard {...base} state="idle">
        {body}
      </RecommendationCard>
    ),
  },
  {
    key: "success",
    label: "Accepted",
    note: "The user said yes and the actions give way to a receipt.",
    Component: () => (
      <RecommendationCard {...base} state="accepted">
        {body}
      </RecommendationCard>
    ),
  },
  {
    key: "long-content",
    label: "Long rationale",
    note: "A long question and rationale wrap above the actions.",
    Component: () => (
      <RecommendationCard
        {...base}
        state="idle"
        question="Move the thread list from local storage to the remote adapter before the 0.12 release?"
        confidenceLabel="medium confidence"
        acceptedLabel="Scheduled for the 0.12 release"
      >
        Users on more than one device see different thread lists today. The
        remote adapter already handles renames and archive, so the switch is a
        config change in <Code>runtime.ts</Code> plus a one-time backfill of{" "}
        <Code>~4,200 threads</Code>. Rollback is a flag flip, but threads
        created while remote is on will not appear in local storage afterward.
      </RecommendationCard>
    ),
  },
]);
