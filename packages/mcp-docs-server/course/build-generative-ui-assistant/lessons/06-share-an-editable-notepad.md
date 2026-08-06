# Share an editable notepad

Weather is a completed result. A notepad is shared, editable state: the
assistant creates it, the learner edits it in place, and the next model request
receives that current state before revising it.

## Read and prepare

1. Start from the working Step 5 application; its live weather card must keep
   working after this step.
2. Read `tools/interactables`, `tools/backend`, and `with-interactables` with
   the docs tool. `unstable_interactableTool` is intentionally unstable, so do
   not upgrade the assistant-ui packages during this lesson.
3. The no-model path also creates a deterministic editable note, so the learner
   can exercise the component without a key. An OpenAI key is only required to
   prove model-selected creation and revision using the learner's latest state.

## Create the editable note

Create `components/tools/notepad.tsx`:

```tsx
"use client";

import type { Unstable_InteractableToolRenderProps } from "@assistant-ui/react";
import { Check, Copy, RotateCcw, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Note = { title: string; content: string };

export function Notepad({ state, setState, version, streaming }: Unstable_InteractableToolRenderProps<Note>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || document.activeElement === body) return;
    if (body.innerText !== state.content) body.innerText = state.content;
  }, [state.content]);
  const historical = version && !version.isLatest;
  const note = historical ? version.state : state;
  return <section className="my-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40">
    <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
      <SquarePen className="size-4 text-[var(--muted-foreground)]" />
      <input aria-label="Note title" value={note.title} disabled={streaming || historical} onChange={(event) => setState((current) => ({ ...current, title: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
      {version && !historical && (state.title !== version.state.title || state.content !== version.state.content) && <button aria-label="Restore saved version" onClick={version.restore} className="rounded-md p-2 hover:bg-[var(--background)]"><RotateCcw className="size-4" /></button>}
      <button aria-label="Copy note" onClick={() => { void navigator.clipboard?.writeText(note.content); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }} className="rounded-md p-2 hover:bg-[var(--background)]">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
    </header>
    <div ref={bodyRef} role="textbox" aria-label="Note text" aria-multiline="true" contentEditable={!streaming && !historical} suppressContentEditableWarning onInput={() => setState((current) => ({ ...current, content: bodyRef.current?.innerText ?? current.content }))} className="min-h-36 whitespace-pre-wrap p-4 leading-7 outline-none">{note.content}</div>
  </section>;
}
```

## Extend the existing toolkit and runtime

Keep the Step 4 Open-Meteo helpers and Step 5 `WeatherCard` registration. In
`app/toolkit.tsx`, add these imports, schema, and toolkit entry:

```tsx
import { defineToolkit, unstable_interactableTool } from "@assistant-ui/react";
import { Notepad } from "../components/tools/notepad";

const notepadSchema = z.object({
  title: z.string().describe("A short title for the note"),
  content: z.string().describe("The complete plain-text note"),
});

// Add alongside geocode_location and get_weather:
notepad: unstable_interactableTool({
  description: "Create a visible editable note for writing tasks. Revise the active note with update_notepad instead of creating a replacement.",
  stateSchema: notepadSchema,
  render: Notepad,
}),
```

Replace `components/runtime-provider.tsx` so it enables interactables while
retaining the existing chat transport:

```tsx
"use client";

import { AssistantRuntimeProvider, unstable_Interactables, useAui } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";

export function RuntimeProvider({ api = "/api/chat", children }: Readonly<{ api?: string; children: React.ReactNode }>) {
  const runtime = useChatRuntime({ transport: new AssistantChatTransport({ api }) });
  const aui = useAui({ unstable_interactables: unstable_Interactables() });
  return <AssistantRuntimeProvider aui={aui} runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

## Give the model current note state

In `app/api/chat/route.ts`, import
`unstable_injectInteractableContext as injectInteractableContext` from
`@assistant-ui/react-ai-sdk`, then replace:

```ts
messages: await convertToModelMessages(messages),
```

with:

```ts
messages: await convertToModelMessages(injectInteractableContext(messages)),
```

Replace the Step 4 no-model guard with this helper and guard. It emits a normal
`notepad` tool call, so the very same registered renderer creates an editable
note; it does not duplicate the component or simulate it with plain text.

```ts
function fallbackNoteResponse(messages: UIMessage[]) {
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const messageId = `msg-${crypto.randomUUID()}`;
      const toolCallId = `notepad-${crypto.randomUUID()}`;
      const note = {
        title: "Dark mode announcement",
        content: "Dark mode is here.\n\nChoose a calmer workspace after sunset.\nTry it today and tell us what you think.",
      };
      writer.write({ type: "start", messageId });
      writer.write({ type: "start-step" });
      writer.write({ type: "tool-input-available", toolCallId, toolName: "notepad", input: note });
      writer.write({ type: "tool-output-available", toolCallId, output: { success: true } });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

// In POST, before the model branch. Keep Step 4's fallbackWeatherResponse.
if (!process.env.OPENAI_API_KEY) {
  const latestText = [...messages].reverse().find((message) => message.role === "user")?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ") ?? "";
  return /weather|forecast|temperature/i.test(latestText)
    ? fallbackWeatherResponse(messages)
    : fallbackNoteResponse(messages);
}
```

The route therefore needs the existing `createUIMessageStream` and
`createUIMessageStreamResponse` imports from Step 4. The model branch must
retain `openai("gpt-5.6-luna")`, its toolkit and
`stepCountIs(5)`, and add this system instruction:

```text
For writing requests, create or revise the active notepad. Use the current
interactable state when revising a learner-edited note.
```

Finally replace the Step 5 suggestions in
`components/assistant-ui/thread.tsx` with:

```tsx
const suggestions = [
  { label: "Create note", prompt: "Draft a short product announcement for a new dark mode in the notepad.", icon: NotebookPen },
  { label: "Weather card", prompt: "What's the weather in San Francisco?", icon: CloudSun },
  { label: "Writing note", prompt: "Create an editable notepad with a four-line launch checklist.", icon: ListChecks },
];
```

Add `ListChecks` and `NotebookPen` to the Lucide import. Keep
`components={{ tools: { Fallback: ToolFallback } }}`: the note and weather
card have their own renderers; unknown tools still expose structured JSON.

## Run and experience shared state

Run `npm run dev` and open the local URL with browser tools when available;
otherwise give it to the learner. With an OpenAI key, select **Create note**
and wait for the editable note. Change its title or a line of content, then
send: “Make the note friendlier, but keep my edited line.”

Verify the assistant revises the existing note instead of creating a second
one, and retains the manually edited line. Use the copy control; optionally
change the note and test Restore saved version. Without a model key, the
fallback still creates the editable sample note; manually edit and copy it to
verify the component. Explain that only the model-selected revision proof is
unavailable on that path.

## Checkpoint

Ask the learner to confirm a note was created and edited directly. With a
model key, also require confirmation that the assistant retained the edit in a
revision. Only then move to saved conversation history in Step 7.
