"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  GitBranch,
  Pencil,
  PencilLine,
  RefreshCw,
  Square,
} from "lucide-react";
import { ToolFallback } from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S3/project/components/assistant-ui/tool-fallback";

const suggestions = [
  {
    label: "Branch a response",
    prompt: "Give me three launch taglines for an AI assistant.",
    icon: GitBranch,
  },
  {
    label: "Compare an edit",
    prompt: "Explain React state in exactly three bullet points.",
    icon: PencilLine,
  },
  {
    label: "Regenerate weather",
    prompt: "What's the weather in London?",
    icon: CloudSun,
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
        <ThreadPrimitive.Messages>
          {({ message }) => {
            if (message.composer.isEditing) return <EditComposer />;
            if (message.role === "user") return <UserMessage />;
            return <AssistantMessage />;
          }}
        </ThreadPrimitive.Messages>
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
    <MessagePrimitive.Root className="group mx-auto flex w-full max-w-2xl flex-col items-end px-4 py-2">
      <div className="max-w-[80%] rounded-2xl bg-[var(--muted)] px-4 py-3">
        <MessagePrimitive.Content />
      </div>
      <div className="mt-1 flex items-center gap-1">
        <BranchPicker />
        <ActionBarPrimitive.Root hideWhenRunning autohide="not-last">
          <ActionBarPrimitive.Edit className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit message</span>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>
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
      <div className="mt-2 flex items-center gap-1">
        <BranchPicker />
        <ActionBarPrimitive.Root hideWhenRunning autohide="not-last">
          <ActionBarPrimitive.Reload className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
            <RefreshCw className="size-3.5" />
            <span className="sr-only">Regenerate response</span>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-2xl px-4 py-2">
      <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-2">
        <ComposerPrimitive.Input asChild>
          <textarea
            aria-label="Edit message"
            autoFocus
            rows={3}
            className="resize-none bg-transparent px-2 py-1 outline-none"
          />
        </ComposerPrimitive.Input>
        <div className="mt-2 flex justify-end gap-2">
          <ComposerPrimitive.Cancel className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--background)]">
            Cancel
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send className="rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-sm text-[var(--background)]">
            Update
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"
    >
      <BranchPickerPrimitive.Previous className="rounded-md p-1 hover:bg-[var(--muted)]">
        <ChevronLeft className="size-3.5" />
        <span className="sr-only">Previous branch</span>
      </BranchPickerPrimitive.Previous>
      <span>
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next className="rounded-md p-1 hover:bg-[var(--muted)]">
        <ChevronRight className="size-3.5" />
        <span className="sr-only">Next branch</span>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}
