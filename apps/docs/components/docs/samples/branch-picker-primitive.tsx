"use client";

import { useEffect, useRef } from "react";
import {
  AssistantRuntimeProvider,
  BranchPickerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useMessageRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const responses = [
  "assistant-ui is a set of React components for building AI chat interfaces. It provides unstyled primitives that handle state management, streaming, and accessibility — you bring the design.",
  "assistant-ui is an open-source library of headless, composable React primitives for AI chat UIs. Style them with any CSS framework — Tailwind, CSS modules, or plain CSS.",
];

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: "text", text: responses[1]! }] };
  },
};

const initialMessages: ThreadMessageLike[] = [
  { role: "user", content: "What is assistant-ui?" },
  { role: "assistant", content: responses[0]! },
];

export function BranchPickerPrimitiveSample() {
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <div className="not-prose flex items-end rounded-xl border border-border/50 bg-muted/40 p-6">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
      <BranchSeeder />
      <BranchPickerPrimitive.Root className="inline-flex items-center gap-0.5 text-muted-foreground text-xs">
        <BranchPickerPrimitive.Previous className="flex size-6 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30">
          <ChevronLeftIcon className="size-3.5" />
        </BranchPickerPrimitive.Previous>
        <span className="tabular-nums">
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
        </span>
        <BranchPickerPrimitive.Next className="flex size-6 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30">
          <ChevronRightIcon className="size-3.5" />
        </BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function BranchSeeder() {
  const messageRuntime = useMessageRuntime();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    const state = messageRuntime.getState();
    if (state.branchCount > 1) return;
    seeded.current = true;
    messageRuntime.reload();
  }, [messageRuntime]);

  return null;
}
