# Document editor

A pages app with a floating assistant. You write in a rich text page, keep pages and subpages, comment on a passage, and ask the assistant to change the page. The assistant edits the page itself, and the edit can be undone like any other.

It is built on [assistant-ui](https://www.assistant-ui.com) and [Lexical](https://lexical.dev). The preview answers from a script, so it runs without a key or a server.

## Files

| File | What it holds |
| --- | --- |
| `page.tsx` | The runtime. Here it is a scripted model; swap it for a real one below. |
| `layout.tsx` | The Geist fonts and the block's root element. |
| `document-editor.tsx` | The page frame, which mounts every piece. |
| `document-editor.css` | The theme tokens (light and dark) and the document's typography. |
| `data.json` | The starter pages, the templates and the scripted replies. |
| `lib/document.ts` | The model: blocks, pages, comment threads, Markdown export, and the store the pieces share. |
| `components/editor.tsx` | The Lexical editor, and the bridge that lets the assistant read and edit the page. |
| `components/assistant-modal.tsx` | The assistant bar at the bottom, which opens into a thread. |
| `components/top-bar.tsx` | The floating pills: the page menu, the insert buttons and the comments toggle. |
| `components/pages-menu.tsx` | The page tree inside the page menu: switch pages, add a page or a subpage. |
| `components/selection-toolbar.tsx` | The format bar over selected text. |
| `components/slash-menu.tsx` | The menu that typing `/` opens. |
| `components/block-handle.tsx` | The grip beside a block: drag to move, click for a menu. |
| `components/comments.tsx` | Comment highlights and their floating threads. |
| `components/ui.tsx` | The icon helper, menu, tooltip, icon button and the shared class strings. |
| `api/chat/route.ts` | The chat route for a real model. Off by default. |

## How the assistant edits the page

`components/editor.tsx` registers the open page and its comments as [interactables](https://www.assistant-ui.com/docs/tools/interactables). assistant-ui builds two tools from their schemas, `update_document` and `update_comments`, and the model calls them. An edit streams into the page as the model writes it and lands as one undo step.

The page is saved in the browser, in `localStorage`, under the key in `lib/document.ts`.

## Run it with a real model

1. Copy `.env.example` to `.env.local` and set both values:

   ```sh
   OPENAI_API_KEY=sk-...
   BLOCKS_LIVE_API=true
   ```

2. In `page.tsx`, replace the scripted runtime with the AI SDK runtime:

   ```tsx
   import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
   import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

   const runtime = useChatRuntime({
     transport: new AssistantChatTransport({ api: "/api/chat" }),
     sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
   });
   ```

   Use the address your app serves `api/chat/route.ts` at. Inside the assistant-ui docs app that is `/blocks/demos/document-editor/api/chat`.

3. Delete `scriptedModel` and `planReply` from `page.tsx`, and `assistant.replies` from `data.json`.

## The `BLOCKS_LIVE_API` guard

Any `route.ts` under `app/` is a public endpoint on the site that serves it. So that this one cannot spend a key by accident, it answers `404` unless `BLOCKS_LIVE_API` is `"true"`.

The route has no sign-in and no rate limit. Add both before you deploy it with a key.

## Requirements

- React 19 and Tailwind CSS 4.
- `@assistant-ui/react`, `assistant-stream`, `lexical` with `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/mark`, `@lexical/history` and `@lexical/utils`, `@base-ui/react`, `@hugeicons/react` with `@hugeicons/core-free-icons`, `lucide-react` and `zod`.
- For a real model: `@assistant-ui/ai-sdk`, `ai` 7 and `@ai-sdk/openai`.
