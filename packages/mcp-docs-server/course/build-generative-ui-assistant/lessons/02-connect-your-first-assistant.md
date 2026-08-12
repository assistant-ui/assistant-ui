# Connect your first assistant

## What you will build

Turn the blank baseline into a real assistant-ui thread connected to an AI
SDK route. The agent will write the thread, runtime provider, layout, page, and
route. A message follows this path:

```text
Composer → assistant-ui runtime → POST /api/chat
  → AI SDK model or deterministic fallback → streamed UI message → Thread
```

Read `runtimes/ai-sdk/v7` and `ui/thread` with `assistantUIDocs`; inspect
`with-ai-sdk-v7` if the agent needs a second reference. Explain this boundary
briefly before editing files.

## Implement

Step 1 installed the foundation packages. Confirm `npm install` completed there
and that `package.json` lists the assistant-ui and AI SDK dependencies before
writing the imports below.

Then replace each file completely. These files are the full stage-2 baseline that
later lessons intentionally extend.

### `app/page.tsx`

```tsx
import { Thread } from "../components/assistant-ui/thread";

export default function Page() {
  return (
    <main className="h-screen min-w-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Thread />
    </main>
  );
}
```

### `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { RuntimeProvider } from "../components/runtime-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generative UI Assistant",
  description: "Built with assistant-ui.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RuntimeProvider>{children}</RuntimeProvider>
      </body>
    </html>
  );
}
```

### `components/runtime-provider.tsx`

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

export function RuntimeProvider({
  api = "/api/chat",
  children,
}: Readonly<{ api?: string; children: React.ReactNode }>) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### `components/assistant-ui/thread.tsx`

```tsx
"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowUp, Square } from "lucide-react";

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
            <div>
              <h1 className="text-2xl font-semibold">How can I help?</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Send a message to start the conversation.
              </p>
            </div>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />

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

### `app/api/chat/route.ts`

```ts
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const messageId = `msg-${crypto.randomUUID()}`;
        const textId = "fallback-text";
        writer.write({ type: "start", messageId });
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });
        writer.write({
          type: "text-delta",
          id: textId,
          delta:
            "This app is running without OPENAI_API_KEY. Add one to .env.local to enable live AI responses.",
        });
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const result = streamText({
    model: openai("gpt-5.4-nano"),
    system: "You are a concise, helpful assistant.",
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

## Run, experience, and verify

Run `npm run dev`. Report the local URL. If a browser tool is available, open
it; otherwise ask the learner to open it. Send `Hi`, watch the reply stream, and
press the stop button while a response is running.

With no key, the exact deterministic fallback text should appear. With a key in
`.env.local`, a live model response should stream instead. Ask the learner to
confirm they saw a message and the stop control. If they cannot, inspect the
browser console and route response before proceeding.

## Checkpoint

Ask: “Did you send a message, see a streamed reply, and test Stop?” Only after
their confirmation offer `assistantUICourse` step 3.
