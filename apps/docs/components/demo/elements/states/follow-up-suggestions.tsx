"use client";

import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions.aui";
import { defineStates } from "./types";

type Suggestion = { prompt: string; title?: string; label?: string };

const CREATED_AT = new Date("2026-09-26T12:00:00Z");

const QUESTION =
  "Our checkout conversion dropped 8% last week. Where should I look first?";
const ANSWER =
  "Start with the payment step. The drop lines up with the new address form, and mobile Safari sessions abandon there twice as often as last month.";

const messages: ThreadMessageLike[] = [
  { id: "user-1", role: "user", content: QUESTION, createdAt: CREATED_AT },
  {
    id: "assistant-1",
    role: "assistant",
    content: ANSWER,
    createdAt: CREATED_AT,
  },
];

function Fixture({
  suggestions,
  isRunning = false,
}: {
  suggestions: readonly Suggestion[];
  isRunning?: boolean;
}) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    suggestions,
    isRunning,
    convertMessage: (message) => message,
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="bg-background flex w-full max-w-2xl flex-col rounded-xl border p-4">
        <div className="flex justify-end">
          <div className="bg-muted max-w-[80%] rounded-2xl px-3.5 py-2 text-sm">
            {QUESTION}
          </div>
        </div>
        <div className="mt-4 max-w-[85%] text-sm leading-relaxed">{ANSWER}</div>
        <div className="mt-5 min-h-8">
          <ThreadFollowupSuggestions />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single",
    label: "One chip",
    note: "A single suggestion sits on its own with no scroll fade.",
    Component: () => (
      <Fixture suggestions={[{ prompt: "Compare mobile Safari to Chrome" }]} />
    ),
  },
  {
    key: "with-labels",
    label: "With labels",
    note: "Suggestions with a short title and a muted label after it.",
    Component: () => (
      <Fixture
        suggestions={[
          {
            title: "Funnel",
            label: "by device",
            prompt: "Break the checkout funnel down by device",
          },
          {
            title: "Sessions",
            label: "last 7 days",
            prompt: "Show recorded sessions that abandoned at payment",
          },
          {
            title: "Rollback",
            label: "address form",
            prompt: "What happens if we roll back the address form?",
          },
        ]}
      />
    ),
  },
  {
    key: "running",
    label: "Running",
    note: "Suggestions stay hidden while the assistant is still answering.",
    Component: () => (
      <Fixture
        isRunning
        suggestions={[{ prompt: "Compare mobile Safari to Chrome" }]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Overflow",
    note: "More chips than fit scroll sideways with a fade at the edge.",
    Component: () => (
      <Fixture
        suggestions={[
          { prompt: "Compare mobile Safari to Chrome" },
          { prompt: "Which address fields cause the most errors?" },
          { prompt: "Draft an A/B test for the old form" },
          { prompt: "Estimate the revenue impact of the drop" },
          { prompt: "Write a short incident summary for the team" },
          { prompt: "List every checkout change shipped this month" },
        ]}
      />
    ),
  },
]);
