"use client";

import {
  ComposerPrimitive,
  ThreadPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

export function ThreadPrimitiveSample() {
  return (
    <SampleRuntimeProvider messages={[]}>
      <div className="not-prose border-border/50 bg-muted/40 flex items-end rounded-xl border p-4">
        <div className="mx-auto w-full max-w-lg">
          <ThreadPrimitive.Root className="flex h-[320px] flex-col">
            <ThreadPrimitive.Viewport className="flex flex-1 flex-col gap-3 overflow-y-auto scroll-smooth p-3">
              <ThreadPrimitive.Empty>
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-foreground text-sm font-medium">
                    Welcome!
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Ask a question to get started.
                  </p>
                </div>
              </ThreadPrimitive.Empty>

              <ThreadPrimitive.Messages
                components={{
                  UserMessage,
                  AssistantMessage,
                }}
              />

              <ThreadPrimitive.ViewportFooter className="sticky bottom-0 pt-2">
                <ComposerPrimitive.Root className="border-border bg-muted dark:border-muted-foreground/15 relative flex w-full flex-col rounded-3xl border shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),0_2px_5px_0px_rgba(0,0,0,0.06)]">
                  <ComposerPrimitive.Input
                    placeholder="Ask anything..."
                    className="field-sizing-content min-h-10 w-full resize-none bg-transparent px-5 pt-3.5 pb-2.5 text-sm leading-relaxed focus:outline-none"
                    rows={1}
                  />
                  <div className="flex items-center justify-end px-2.5 pb-2.5">
                    <ComposerPrimitive.Send className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30">
                      <ArrowUpIcon className="size-4" />
                    </ComposerPrimitive.Send>
                  </div>
                </ComposerPrimitive.Root>
              </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>
        </div>
      </div>
    </SampleRuntimeProvider>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start">
      <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}
