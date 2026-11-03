"use client";

import {
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

type Timing = NonNullable<NonNullable<ThreadMessageLike["metadata"]>["timing"]>;

const QUESTION = "Which regions does the edge cache cover?";
const ANSWER =
  "The edge cache serves from 14 regions. Requests from anywhere else fall back to us-east-1.";

function TimedMessage() {
  const isUser = useAuiState((s) => s.message.role === "user");
  return (
    <MessagePrimitive.Root className="text-sm leading-relaxed">
      {isUser ? (
        <div className="bg-muted ms-auto w-fit max-w-[85%] rounded-2xl px-4 py-2">
          <MessagePrimitive.Parts />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <MessagePrimitive.Parts />
          <div className="-ms-1 flex h-6 items-center">
            <MessageTiming />
          </div>
        </div>
      )}
    </MessagePrimitive.Root>
  );
}

function TimingFixture({
  timing,
  running = false,
  text = ANSWER,
}: {
  timing?: Timing;
  running?: boolean;
  text?: string;
}) {
  const messages: ThreadMessageLike[] = [
    { role: "user", content: QUESTION },
    {
      role: "assistant",
      content: text,
      ...(running && { status: { type: "running" } }),
      ...(timing && { metadata: { timing } }),
    },
  ];
  return (
    <SampleRuntimeProvider messages={messages}>
      <ThreadPrimitive.Root className="flex h-full w-full items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <ThreadPrimitive.Messages>
            {() => <TimedMessage />}
          </ThreadPrimitive.Messages>
        </div>
      </ThreadPrimitive.Root>
    </SampleRuntimeProvider>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "complete",
    label: "Complete",
    note: "A finished reply shows its total time as a badge in the action row.",
    Component: () => (
      <TimingFixture
        timing={{
          streamStartTime: 0,
          firstTokenTime: 284,
          totalStreamTime: 1_470,
          tokenCount: 118,
          tokensPerSecond: 99.4,
          totalChunks: 52,
          toolCallCount: 0,
        }}
      />
    ),
  },
  {
    key: "streaming",
    label: "Streaming",
    note: "The badge stays hidden until the stream completes.",
    Component: () => (
      <TimingFixture
        running
        text="The edge cache serves from 14 regions. Requests from"
        timing={{
          streamStartTime: 0,
          firstTokenTime: 284,
          totalChunks: 21,
          toolCallCount: 0,
        }}
      />
    ),
  },
  {
    key: "sub-second",
    label: "Sub-second",
    note: "A run under one second reads in milliseconds.",
    Component: () => (
      <TimingFixture
        text="14 regions."
        timing={{
          streamStartTime: 0,
          firstTokenTime: 190,
          totalStreamTime: 412,
          tokenCount: 4,
          tokensPerSecond: 9.7,
          totalChunks: 3,
          toolCallCount: 0,
        }}
      />
    ),
  },
  {
    key: "long-run",
    label: "Long run",
    note: "A slow run with tool calls reads in seconds.",
    Component: () => (
      <TimingFixture
        timing={{
          streamStartTime: 0,
          firstTokenTime: 6_820,
          totalStreamTime: 48_630,
          tokenCount: 2_904,
          tokensPerSecond: 69.4,
          totalChunks: 611,
          toolCallCount: 4,
        }}
      />
    ),
  },
]);
