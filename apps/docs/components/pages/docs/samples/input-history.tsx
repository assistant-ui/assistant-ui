"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  unstable_useComposerInputHistory,
} from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

const MESSAGES = [
  { role: "user" as const, content: "Summarize this week's sales" },
  { role: "assistant" as const, content: "Sales rose 12% over last week." },
  { role: "user" as const, content: "Break it down by region" },
  {
    role: "assistant" as const,
    content: "Europe led with 18%, then North America with 9%.",
  },
  { role: "user" as const, content: "Draft an email to the team" },
  { role: "assistant" as const, content: "Here is a draft for the team." },
];

function Composer() {
  const history = unstable_useComposerInputHistory();
  return (
    <ComposerPrimitive.Root className="border-foreground/10 bg-background flex w-full items-end gap-2 rounded-xl border p-2">
      <ComposerPrimitive.Input
        {...history}
        autoFocus={false}
        rows={1}
        placeholder="Click here, then press ArrowUp"
        aria-label="Message with input history"
        className="field-sizing-content min-h-8 w-full resize-none bg-transparent px-2 py-1.5 text-sm focus:outline-none"
      />
      <ComposerPrimitive.Send
        aria-label="Send"
        className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-30"
      >
        <ArrowUpIcon className="size-4" />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

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

export function InputHistorySample() {
  return (
    <SampleRuntimeProvider messages={MESSAGES}>
      <div className="not-prose border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document my-6 border p-4">
        <ThreadPrimitive.Root className="mx-auto flex max-w-lg flex-col gap-3">
          <div className="flex flex-col gap-2">
            <ThreadPrimitive.Messages>
              {() => <Message />}
            </ThreadPrimitive.Messages>
          </div>
          <Composer />
        </ThreadPrimitive.Root>
      </div>
    </SampleRuntimeProvider>
  );
}
