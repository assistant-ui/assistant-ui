# Agent document editor

A rich text document beside an assistant thread. The assistant reads and edits the document with three tools that run in the browser, and every change it makes is one undo step.

## Setup

The block targets the Next.js App Router. The route calls OpenAI through the AI SDK, so add a key to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

Start the app and open `/document-editor`.

## Files

| File | Purpose |
| --- | --- |
| `app/document-editor/page.tsx` | The page. Renders `DocumentEditor`. |
| `app/document-editor/layout.tsx` | Page metadata and the full-height frame. |
| `app/api/document-editor/route.ts` | Streams the reply, with the editor's system prompt and the tools the page registers. |
| `components/document-editor/document-editor.tsx` | Creates the document store, the toolkit, and the chat runtime. |
| `components/document-editor/document-workspace.tsx` | The layout: the document beside the thread with a handle to resize them, or one at a time in a narrow container. |
| `components/document-editor/document-pane.tsx` | The Lexical editor, its theme, and the word count. |
| `components/document-editor/document-toolbar.tsx` | Headings, bold, italic, lists, undo, redo, copy, and download. |
| `hooks/use-document.ts` | `useDocumentEditor` creates the store and toolkit; `useDocument` reads the store. |
| `lib/document-editor/document.ts` | The single-match replace the edit tool uses, and small text helpers. |
| `lib/document-editor/document-store.ts` | The store: the document as Markdown, and the user's selection. |
| `lib/document-editor/document-sync.ts` | Keeps the editor and the store in step. |
| `lib/document-editor/document-toolkit.ts` | The tools the assistant calls. |
| `lib/document-editor/markdown.ts` | The node types the editor renders and their Markdown transformers. |
| `lib/document-editor/prompts.ts` | The system prompt and the starter suggestions. |

## How it works

The editor is [Lexical](https://lexical.dev). You write in rich text; the assistant reads and writes the same document as Markdown. `registerDocumentSync` converts between the two: what you type reaches the store as Markdown, and a change the assistant makes in the store is loaded into the editor.

`createDocumentToolkit` binds three frontend tools to the store:

| Tool | What it does |
| --- | --- |
| `read_document` | Returns the content and the text the user has selected. |
| `edit_document` | Replaces one passage. `find` must match exactly one place, otherwise the tool returns an error the model can correct. |
| `write_document` | Replaces the whole document. |

`DocumentEditor` registers the toolkit on the runtime, so the page sends the tool schemas with each request and runs the calls itself. The route adds the system prompt and forwards the schemas to the model; it never sees the document except as tool results in the conversation.

Undo and redo run through the editor's history. Each assistant change is its own step, so undo reverts one edit at a time and keeps what you typed before it.

The editor renders headings, bold, italic, strikethrough, inline code, links, quotes, and bulleted and numbered lists, and turns Markdown into formatting as you type it. The first heading names the downloaded file.

The document is held in memory and resets on reload.

## Customize

Change the model in `app/api/document-editor/route.ts`. Any AI SDK provider works:

```ts
import { anthropic } from "@ai-sdk/anthropic";

const result = streamText({
  model: anthropic("claude-sonnet-5-5"),
  // ...
});
```

Open the editor with a document:

```tsx
<DocumentEditor initialContent={"# Launch plan\n\nShip on Friday."} />
```

Point it at another route:

```tsx
<DocumentEditor api="/api/my-editor" />
```

To use a runtime other than the AI SDK, render `DocumentWorkspace` under your own provider:

```tsx
"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
} from "@assistant-ui/react";
import { DocumentWorkspace } from "@/components/document-editor/document-workspace";
import { DocumentStoreContext, useDocumentEditor } from "@/hooks/use-document";

export function MyDocumentEditor() {
  const { store, toolkit } = useDocumentEditor();
  const runtime = useMyRuntime();
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <DocumentStoreContext.Provider value={store}>
        <DocumentWorkspace />
      </DocumentStoreContext.Provider>
    </AssistantRuntimeProvider>
  );
}
```

That runtime's backend needs the instructions in `lib/document-editor/prompts.ts` as its system prompt.

To support another kind of formatting, add its node to `DOCUMENT_NODES` and its transformer to `DOCUMENT_TRANSFORMERS` in `lib/document-editor/markdown.ts`, style it in the theme in `document-pane.tsx`, and name it in the system prompt.

Add a tool by adding an entry to `createDocumentToolkit` and a line about it to the system prompt.
