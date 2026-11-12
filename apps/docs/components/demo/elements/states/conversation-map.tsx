"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ConversationMapAui } from "@/components/assistant-ui/elements/conversation-map.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { cn } from "@/lib/utils";
import { defineStates } from "./types";

function MapMessage() {
  const isUser = useAuiState((s) => s.message.role === "user");
  return (
    <MessagePrimitive.Root
      className={cn(
        "text-[13px] leading-relaxed",
        isUser ? "text-foreground/90 font-medium" : "text-foreground/60",
      )}
    >
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function MapFixture({ messages }: { messages: ThreadMessageLike[] }) {
  return (
    <SampleRuntimeProvider messages={messages}>
      <div className="bg-muted/40 h-full min-h-120 w-full">
        <ThreadPrimitive.Root className="flex h-full flex-col">
          <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-scroll">
            <ConversationMapAui className="max-sm:hidden" />
            <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-10">
              <ThreadPrimitive.Messages>
                {() => <MapMessage />}
              </ThreadPrimitive.Messages>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </div>
    </SampleRuntimeProvider>
  );
}

const pairs = (turns: [string, string][]): ThreadMessageLike[] =>
  turns.flatMap(([user, assistant]) => [
    { role: "user" as const, content: user },
    { role: "assistant" as const, content: assistant },
  ]);

const SINGLE = pairs([
  [
    "Why did the nightly export job fail?",
    "The job hit the 15 minute Lambda timeout while compressing the March archive. Splitting the export by month keeps each run under four minutes.",
  ],
]);

const IN_PROGRESS: ThreadMessageLike[] = [
  ...SINGLE,
  {
    role: "user",
    content:
      "Can you split the export by month and rerun it for March? Keep the archive name the same so the downstream sync still finds it.",
  },
  { role: "assistant", content: "", status: { type: "running" } },
];

const TOPICS = [
  "billing webhooks",
  "the retry queue",
  "S3 lifecycle rules",
  "the staging deploy",
  "rate limits",
  "the search index",
  "session cookies",
  "the CSV importer",
  "audit logs",
  "the mobile build",
  "feature flags",
  "the Postgres upgrade",
];

const LONG = pairs(
  Array.from({ length: 24 }, (_, i) => {
    const topic = TOPICS[i % TOPICS.length]!;
    return [
      `Step ${i + 1}: what changed in ${topic} this week?`,
      `Two pull requests touched ${topic}. Both are merged, and the follow-up check on staging passed without new warnings.`,
    ] as [string, string];
  }),
);

const MIXED: ThreadMessageLike[] = [
  {
    role: "user",
    content: "Find last week's p95 latency for the checkout API.",
  },
  {
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "call_metrics_1",
        toolName: "query_metrics",
        args: { service: "checkout-api", metric: "p95", range: "7d" },
        result: { p95_ms: 412 },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        type: "image",
        image:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'/>",
      },
    ],
  },
  {
    role: "assistant",
    content:
      "The screenshot shows the spike at 14:20 UTC, which lines up with the 412ms p95 from the metrics query.",
  },
  { role: "user", content: "Compare it with the week before." },
  {
    role: "assistant",
    content: [
      {
        type: "reasoning",
        text: "I need both weeks from the same source before comparing.",
      },
      {
        type: "tool-call",
        toolCallId: "call_metrics_2",
        toolName: "query_metrics",
        args: { service: "checkout-api", metric: "p95", range: "14d" },
        result: { p95_ms: 288 },
      },
      {
        type: "tool-call",
        toolCallId: "call_deploys_1",
        toolName: "list_deploys",
        args: { service: "checkout-api", range: "14d" },
        result: { deploys: 3 },
      },
      {
        type: "text",
        text: "Latency rose from 288ms to 412ms after the deploy on Tuesday.",
      },
    ],
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single-turn",
    label: "Single turn",
    note: "A thread with one exchange draws a single tick.",
    Component: () => <MapFixture messages={SINGLE} />,
  },
  {
    key: "in-progress",
    label: "In progress",
    note: "The last turn has no answer yet, so its preview falls back to the question.",
    Component: () => <MapFixture messages={IN_PROGRESS} />,
  },
  {
    key: "long-content",
    label: "Long thread",
    note: "Twenty-four turns pack the rail while the viewport shows only a few.",
    Component: () => <MapFixture messages={LONG} />,
  },
  {
    key: "non-text",
    label: "Non-text turns",
    note: "A turn that opens with an image instead of text gets a fallback title.",
    Component: () => <MapFixture messages={MIXED} />,
  },
]);
