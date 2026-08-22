# Guide the first message

The chat works, but an empty conversation is not yet a useful starting point.
In this step, you will make the thread application-owned UI: a focused welcome,
three suggestions, and readable message/composer styling. assistant-ui supplies
the behavior; your app controls the copy, prompts, layout, and visual design.

## Before you edit

1. Confirm that Step 2 is working. Start the app with `npm run dev` and send a
   message. Do not replace the runtime or `/api/chat` route in this step.
2. Use the docs tool to read `primitives/thread`, `primitives/message`, and
   `primitives/composer`. In particular, understand that
   `ThreadPrimitive.Suggestion` sends its `prompt` through the active thread.
3. Inspect `components/assistant-ui/thread.tsx`. This is the one file you will
   replace; the runtime and route remain the working foundation from Step 2.

## Implement the guided empty state

Replace `components/assistant-ui/thread.tsx` with the following complete file.
It deliberately uses ordinary thread primitives: the suggestions do not call a
second API or invent separate message state.

```tsx
"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowUp, Code2, Lightbulb, PencilLine, Square } from "lucide-react";

const suggestions = [
  {
    label: "Ideas",
    prompt: "Give me three ideas for a small weekend React project.",
    icon: Lightbulb,
  },
  {
    label: "Code",
    prompt: "Explain React hooks like useState and useEffect.",
    icon: Code2,
  },
  {
    label: "Write",
    prompt: "Draft a short product announcement for a new dark mode.",
    icon: PencilLine,
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
        <ThreadPrimitive.Empty>
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
        </ThreadPrimitive.Empty>

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
      <MessagePrimitive.Content />
    </MessagePrimitive.Root>
  );
}
```

## Run and experience it

Run `npm run dev`. If browser tools are available, open the local URL yourself;
otherwise give the URL to the learner and ask them to open it.

On the empty screen, confirm the welcome copy and **Ideas**, **Code**, and
**Write** buttons are visible. Predict the prompt behind one button, click it,
and verify that its exact prompt appears as a normal user message and receives
a normal assistant response. The welcome suggestions should disappear once the
thread contains a message. Start a new empty conversation if necessary and
repeat with a different suggestion.

## Checkpoint

Ask the learner to confirm they used a suggestion and saw it behave exactly
like a typed message. Do not proceed until the app runs and that interaction
has succeeded.
