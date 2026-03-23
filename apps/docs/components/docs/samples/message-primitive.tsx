"use client";

import {
  MessagePrimitive,
  MessagePartPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

export function MessagePrimitiveSample() {
  return (
    <div className="not-prose flex items-end rounded-xl border border-border/50 bg-muted/40 p-4">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
        <SampleRuntimeProvider>
          <ThreadPrimitive.Messages
            components={{
              UserMessage: CustomUserMessage,
              AssistantMessage: CustomAssistantMessage,
            }}
          />
        </SampleRuntimeProvider>
      </div>
    </div>
  );
}

function CustomUserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground text-sm">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function CustomAssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
        AI
      </div>
      <div className="max-w-[80%] space-y-2 rounded-2xl bg-muted px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts components={{ Text: AssistantText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function UserText() {
  return (
    <p>
      <MessagePartPrimitive.Text />
    </p>
  );
}

function AssistantText() {
  return (
    <p className="leading-relaxed">
      <MessagePartPrimitive.Text />
    </p>
  );
}
