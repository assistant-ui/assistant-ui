"use client";

import {
  ResearchReport,
  type ReportSection,
} from "@/components/assistant-ui/elements/research-report";
import { defineStates } from "./types";

const TITLE = "Draft ownership in 0.14";

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
  "Remote drafts across devices are not covered yet and need an adapter hook.",
] as const;

const SOURCES = [4, 3, 2, 1] as const;

function sectionsAt(progress: number): ReportSection[] {
  return HEADINGS.map((heading, i) => ({
    id: heading,
    heading,
    state: i < progress ? "done" : i === progress ? "writing" : "pending",
    sources: i < progress ? SOURCES[i]! : 0,
    ...(i < progress ? { preview: PREVIEWS[i]! } : {}),
  }));
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "outline",
    label: "Outline",
    note: "The outline is set and the first section has started writing.",
    Component: () => (
      <ResearchReport title={TITLE} sections={sectionsAt(0)} sourcesRead={6} />
    ),
  },
  {
    key: "partial",
    label: "Partial",
    note: "Two sections are written, one is in progress, and one is waiting.",
    Component: () => (
      <ResearchReport title={TITLE} sections={sectionsAt(2)} sourcesRead={15} />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "Every section is written with its sources counted.",
    Component: () => (
      <ResearchReport title={TITLE} sections={sectionsAt(4)} sourcesRead={21} />
    ),
  },
  {
    key: "long-content",
    label: "Long sections",
    note: "Long headings truncate and long previews wrap under them.",
    Component: () => (
      <ResearchReport
        title="How assistant-ui, Vercel AI SDK, and CopilotKit handle composer drafts, attachments, and thread switching"
        sections={[
          {
            id: "a",
            heading:
              "Where each library stores the unsent draft and when it is cleared",
            state: "done",
            sources: 12,
            preview:
              "assistant-ui keeps a per-thread slot owned by the composer. The AI SDK leaves the input in component state, so it resets on unmount. CopilotKit stores it in its context provider and keeps it across route changes but not across reloads.",
          },
          {
            id: "b",
            heading:
              "Attachment uploads that are still in flight when the thread changes",
            state: "writing",
            sources: 5,
          },
          {
            id: "c",
            heading: "Recommendations for apps that sync drafts across devices",
            state: "pending",
            sources: 0,
          },
        ]}
        sourcesRead={38}
      />
    ),
  },
]);
