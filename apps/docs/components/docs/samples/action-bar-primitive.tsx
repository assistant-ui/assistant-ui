"use client";

import {
  ActionBarPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

export function ActionBarPrimitiveSample() {
  return (
    <div className="not-prose flex items-end rounded-xl border border-border/50 bg-muted/40 p-4">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <SampleRuntimeProvider>
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </SampleRuntimeProvider>
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
    <MessagePrimitive.Root className="group flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        autohideFloat="always"
        className="flex gap-0.5 data-[floating]:opacity-0 data-[floating]:transition-opacity data-[floating]:group-hover:opacity-100"
      >
        <ActionBarPrimitive.Copy className="group/copy flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <CopyIcon className="size-4 group-data-[copied]/copy:hidden" />
          <CheckIcon className="hidden size-4 group-data-[copied]/copy:block" />
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <RefreshCwIcon className="size-4" />
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}
