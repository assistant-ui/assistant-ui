"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowUp,
  CloudSun,
  ListChecks,
  NotebookPen,
  Square,
} from "lucide-react";
import { ToolFallback } from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S3/project/components/assistant-ui/elements/tool-fallback.aui";

const suggestions = [
  {
    label: "Create note",
    prompt:
      "Draft a short product announcement for a new dark mode in the notepad.",
    icon: NotebookPen,
  },
  {
    label: "Weather card",
    prompt: "What's the weather in San Francisco?",
    icon: CloudSun,
  },
  {
    label: "Writing note",
    prompt: "Create an editable notepad with a four-line launch checklist.",
    icon: ListChecks,
  },
];

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full min-w-0 flex-col">
      <header className="border-b border-[var(--border)] px-5 py-4">
        <p className="font-medium">Generative UI Assistant</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Built with assistant-ui
        </p>
      </header>
      <ThreadPrimitive.Viewport className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="w-full max-w-2xl">
              <h1 className="text-2xl font-semibold">
                How can I help you today?
              </h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Choose a starting point or ask anything.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {suggestions.map(({ label, prompt, icon: Icon }) => (
                  <ThreadPrimitive.Suggestion
                    key={label}
                    prompt={prompt}
                    asChild
                  >
                    <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left text-sm hover:bg-[var(--muted)]">
                      <Icon className="size-4 text-[var(--muted-foreground)]" />
                      {label}
                    </button>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </div>
        </AuiIf>
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto w-full bg-[var(--background)] p-4">
          <ComposerPrimitive.Root className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-2">
            <ComposerPrimitive.Input asChild>
              <textarea
                aria-label="Message"
                placeholder="Ask anything..."
                rows={1}
                className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 outline-none"
              />
            </ComposerPrimitive.Input>
            <AuiIf condition={(state) => !state.thread.isRunning}>
              <ComposerPrimitive.Send className="flex size-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)] disabled:opacity-40">
                <ArrowUp className="size-4" />
                <span className="sr-only">Send message</span>
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(state) => state.thread.isRunning}>
              <ComposerPrimitive.Cancel className="flex size-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)]">
                <Square className="size-3.5" fill="currentColor" />
                <span className="sr-only">Stop generating</span>
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-2xl justify-end px-4 py-2">
      <div className="max-w-[80%] rounded-2xl bg-[var(--muted)] px-4 py-3">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-2xl px-4 py-3 leading-7">
      <MessagePrimitive.Content
        components={{ tools: { Fallback: ToolFallback } }}
      />
    </MessagePrimitive.Root>
  );
}
