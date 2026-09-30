import {
  ActionBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { MessageTiming } from "@assistant-ui/ui/components/assistant-ui/elements/message-timing.aui.tsx";
import {
  MessageTiming as MessageTimingStats,
  type TimingStat,
} from "@assistant-ui/ui/components/assistant-ui/elements/message-timing.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { OpenOnMount } from "./_chat-helpers";

const MESSAGES: ThreadMessageLike[] = [
  { role: "user", content: "Summarize the fetch bridge in one sentence." },
  {
    role: "assistant",
    content:
      "The webview tunnels fetch over postMessage and the extension host streams the response back.",
    metadata: {
      timing: {
        streamStartTime: 0,
        firstTokenTime: 312,
        totalStreamTime: 1230,
        tokenCount: 101,
        tokensPerSecond: 82.5,
        totalChunks: 47,
        toolCallCount: 0,
      },
    },
  },
];

function Message() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-1 text-sm">
      <MessagePrimitive.Parts />
      <ActionBarPrimitive.Root className="flex">
        <MessageTiming side="right" />
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function TimedThread() {
  return (
    <SeededRuntime messages={MESSAGES}>
      <ThreadPrimitive.Root className="flex flex-col gap-3">
        <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
      </ThreadPrimitive.Root>
    </SeededRuntime>
  );
}

const STREAMING: TimingStat[] = [
  { label: "ttft", value: "0.4s" },
  { label: "elapsed", value: "1.7s" },
  { label: "tok/s", value: "58" },
];

const DONE: TimingStat[] = [
  { label: "ttft", value: "0.4s" },
  { label: "total", value: "2.6s" },
  { label: "tok/s", value: "61" },
  { label: "tokens", value: "1,204" },
  { label: "cost", value: "$0.018" },
];

export default defineSections([
  {
    id: "message-timing",
    title: "Message timing (runtime)",
    category: "chat",
    notes:
      "message-timing.aui.tsx in the action bar, reading seeded metadata.timing; the badge shows the total time.",
    render: () => <TimedThread />,
  },
  {
    id: "message-timing-open",
    title: "Message timing (tooltip open)",
    category: "chat",
    notes: "The badge hovered on mount opens the stats tooltip.",
    render: () => (
      <OpenOnMount
        selector="[data-slot=message-timing-trigger]"
        action="hover"
        className="min-h-36"
      >
        <TimedThread />
      </OpenOnMount>
    ),
  },
  {
    id: "message-timing-stats",
    title: "Message timing (standalone)",
    category: "chat",
    notes: "message-timing.tsx: streaming, then settled.",
    render: () => (
      <div className="flex flex-col gap-3">
        <MessageTimingStats stats={STREAMING} streaming />
        <MessageTimingStats stats={DONE} />
      </div>
    ),
  },
]);
