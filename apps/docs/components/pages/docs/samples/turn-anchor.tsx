"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useAui,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";

const QUESTION = "How do I pick a runtime?";
const ANSWER =
  "Start from where your messages live. If your backend speaks the AI SDK protocol, use the AI SDK runtime and you are done. If you run LangGraph, use its runtime so threads and interrupts map onto LangGraph's own. If your app already keeps messages in a store such as Redux or Zustand, use the external store runtime and hand it those messages. Otherwise, start with the local runtime: you write one function that calls your API, and editing, regenerating and branching work without more code. You can switch later, because every runtime exposes the same state to your components.";

const TURN_ANCHORS = ["bottom", "top"] as const;

const CREATED_AT = new Date("2026-11-26T12:00:00Z");
const HISTORY = [
  {
    role: "user" as const,
    content: "What is a runtime?",
    createdAt: CREATED_AT,
  },
  {
    role: "assistant" as const,
    content:
      "The runtime holds the conversation and talks to your backend. Components read its state and send it actions.",
    createdAt: CREATED_AT,
  },
];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const streamingModel: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const words = ANSWER.split(" ");
    for (let i = 1; i <= words.length; i++) {
      await wait(30, abortSignal);
      if (abortSignal.aborted) return;
      yield { content: [{ type: "text", text: words.slice(0, i).join(" ") }] };
    }
  },
};

function Message() {
  const isUser = useAuiState((s) => s.message.role === "user");
  return (
    <MessagePrimitive.Root
      className={cn("flex text-sm leading-relaxed", isUser && "justify-end")}
    >
      <div
        className={cn(
          "max-w-[85%]",
          isUser && "bg-foreground/[0.06] rounded-lg px-3 py-1.5",
        )}
      >
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AskOnSignal({
  signal,
  onRunningChange,
}: {
  signal: number;
  onRunningChange: (running: boolean) => void;
}) {
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  useEffect(() => onRunningChange(isRunning), [isRunning, onRunningChange]);
  const last = useRef(signal);
  useEffect(() => {
    if (signal === last.current) return;
    last.current = signal;
    aui.thread().append({
      role: "user",
      content: [{ type: "text", text: QUESTION }],
    });
  }, [aui, signal]);
  return null;
}

function AnchoredThread({
  turnAnchor,
  signal,
  onRunningChange,
}: {
  turnAnchor: "top" | "bottom";
  signal: number;
  onRunningChange: (running: boolean) => void;
}) {
  const runtime = useLocalRuntime(streamingModel, { initialMessages: HISTORY });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AskOnSignal signal={signal} onRunningChange={onRunningChange} />
      <figure className="min-w-0">
        <figcaption className="text-muted-foreground mb-2 text-xs">
          <span className="font-mono">turnAnchor=&quot;{turnAnchor}&quot;</span>
        </figcaption>
        <ThreadPrimitive.Root className="border-foreground/10 bg-background rounded-document border">
          <ThreadPrimitive.Viewport
            turnAnchor={turnAnchor}
            className="flex h-64 flex-col gap-3 overflow-y-auto p-3"
          >
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </figure>
    </AssistantRuntimeProvider>
  );
}

export function TurnAnchorSample() {
  const [signal, setSignal] = useState(0);
  const [running, setRunning] = useState({ bottom: false, top: false });
  const onRunningChange = useMemo(
    () =>
      Object.fromEntries(
        TURN_ANCHORS.map((anchor) => [
          anchor,
          (value: boolean) =>
            setRunning((prev) =>
              prev[anchor] === value ? prev : { ...prev, [anchor]: value },
            ),
        ]),
      ) as Record<(typeof TURN_ANCHORS)[number], (running: boolean) => void>,
    [],
  );
  return (
    <div className="not-prose border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document my-6 border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Send the same question to both threads and watch where the reply
          streams.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={running.bottom || running.top}
          onClick={() => setSignal((n) => n + 1)}
        >
          Send to both
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TURN_ANCHORS.map((turnAnchor) => (
          <SampleScope key={turnAnchor}>
            <AnchoredThread
              turnAnchor={turnAnchor}
              signal={signal}
              onRunningChange={onRunningChange[turnAnchor]}
            />
          </SampleScope>
        ))}
      </div>
    </div>
  );
}
