# Document editor

A pages app with a floating assistant. You write in a rich text page, keep pages and subpages, comment on a passage, and ask the assistant to change the page. The assistant edits the page itself. In Manual mode its edit is highlighted and waits for you to accept or undo it.

It is built on [assistant-ui](https://www.assistant-ui.com) and [Lexical](https://lexical.dev). The preview answers from a script, so it runs without a key or a server. The second starter page, Welcome, walks through every feature.

## What it does

- **The page.** Headings, checklists, lists, quotes, dividers and tables, inserted from the `/` menu or the pill at the top. A format bar sits over selected text. A grip beside each block drags it, turns it into another kind of block, and copies a link that opens the page at that block.
- **Tables.** A header row, cells you type in, and a handle on each row and column that inserts, moves and deletes. `Alt+Shift+R` and `Alt+Shift+C` open the two menus from the keyboard.
- **Pages.** Subpages, templates, an emoji or a colored icon for each page, links to other pages from the `@` menu, an outline of the headings on the left edge of a wide window, and Markdown download.
- **Comments.** Threads on a passage, with replies, emoji reactions and resolve. Mention `@Assistant` in a thread and it answers there. The assistant can also leave comments of its own.
- **The assistant.** A bar you can move, resize and minimise to a round button, which shows a dot when there is something new. It keeps the chats of the visit under History, takes files and pictures, takes dictation where the browser supports it, and offers follow-ups after an edit. Ask AI on selected text, or Ask for change on an edit, quotes that passage in the next message.

## Files

| File | What it holds |
| --- | --- |
| `page.tsx` | The runtime: a list of chats, each answered by a scripted model. Swap it for a real one below. |
| `layout.tsx` | The Geist fonts and the block's root element. |
| `document-editor.tsx` | The page frame, which mounts every piece. |
| `document-editor.css` | The theme tokens (light and dark) and the document's typography. |
| `data.json` | The profile pictures, the starter pages, the templates and the scripted replies. |
| `lib/document.ts` | The model: blocks, pages, comment threads, edit review, Markdown export, and the store the pieces share. |
| `components/editor.tsx` | The Lexical editor, the page link node, and the bridge that lets the assistant read and edit the page. |
| `components/assistant-modal.tsx` | The assistant bar: thread, composer, edit permissions, moving, resizing and the round button it minimises to. |
| `components/thread-list.tsx` | The chats of this visit, inside the bar's History popover. |
| `components/edit-review.tsx` | The Undo, Ask for change and Accept pill under an edit, and the assistant's name flag where it writes. |
| `components/top-bar.tsx` | The floating pills: the page menu, the insert buttons and the comments toggle. |
| `components/pages-menu.tsx` | The page tree inside the page menu: switch pages, add a page or a subpage. |
| `components/icon-picker.tsx` | The page icon above the title and its emoji and icon picker, with a color for an icon. |
| `components/outline.tsx` | The outline rail on the left edge. |
| `components/selection-toolbar.tsx` | The format bar over selected text, with Ask AI and Comment. |
| `components/slash-menu.tsx` | The menu that typing `/` opens, and the page menu that typing `@` opens. |
| `components/block-handle.tsx` | The grip beside a block: drag to move, click for a menu. |
| `components/table.tsx` | The row and column handles of a table and their menus. |
| `components/comments.tsx` | Comment highlights and their floating threads, with reactions. |
| `components/ui.tsx` | The icon helper, avatar, menu, popover, tooltip, buttons and the shared class strings. |
| `api/chat/route.ts` | The chat route for a real model. Off by default. |

## How the assistant edits the page

`components/editor.tsx` registers the open page and its comments as [interactables](https://www.assistant-ui.com/docs/tools/interactables). assistant-ui builds two tools from their schemas, `update_document` and `update_comments`, and the model calls them. An edit streams into the page as the model writes it, with the assistant's name at the place it is writing, and lands as one undo step.

The page, the edit mode and an edit that waits for review are saved in the browser, in `localStorage`, under the key in `lib/document.ts`. The bar's size is kept in `sessionStorage`, and chats last until the page is reloaded.

## Reviewing an edit

The menu in the composer sets the edit mode, kept as `editMode` in the store.

- **Manual** (the default). The blocks an edit changed are marked on the page, and a pill under them offers Undo, Ask for change and Accept. Undo puts the page back as it was before the assistant's request, as one step. `Cmd+Enter` accepts and `Cmd+Backspace` undoes (`Ctrl` on Windows and Linux). With the caret in the page, `Cmd+Backspace` deletes text as usual.
- **Auto.** Edits land with no review. Undo in the page still takes one back.

One review holds the edits of one request. Editing the page by hand, or asking for another edit, accepts the one that waits. The review is `pendingReview` in the store: the page before the edit and the ids of the blocks that changed, worked out by `reviewOf` in `lib/document.ts`.

## The scripted preview

`scriptedModel` in `page.tsx` matches the message against `assistant.replies` in `data.json` and makes the same tool calls a model would, so the page really changes. It knows a handful of requests, which are the suggestions it offers, and says so when asked for anything else. It does not read attached files and cannot rewrite a quoted passage. A mention in a comment is answered from `assistant.commentReplies`.

## Run it with a real model

1. Copy `.env.example` to `.env.local` and set both values:

   ```sh
   OPENAI_API_KEY=sk-...
   BLOCKS_LIVE_API=true
   ```

2. In `page.tsx`, replace `useScriptedRuntime()` with the AI SDK runtime:

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

History, Add files and the microphone come from the scripted runtime's thread list and its attachment and dictation adapters, so pass the same adapters to your runtime to keep them. The microphone hides when there is no dictation adapter. The route already passes a quoted passage to the model with `injectQuoteContext`.

## The `BLOCKS_LIVE_API` guard

Any `route.ts` under `app/` is a public endpoint on the site that serves it. So that this one cannot spend a key by accident, it answers `404` unless `BLOCKS_LIVE_API` is `"true"`.

The route has no sign-in and no rate limit. Add both before you deploy it with a key.

## Requirements

- React 19 and Tailwind CSS 4.
- `@assistant-ui/react`, `@assistant-ui/react-markdown`, `assistant-stream`, `lexical` with `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/mark`, `@lexical/table`, `@lexical/history` and `@lexical/utils`, `@base-ui/react`, `@hugeicons/react` with `@hugeicons/core-free-icons`, `lucide-react`, `tw-shimmer` and `zod`.
- For a real model: `@assistant-ui/ai-sdk`, `ai` 7 and `@ai-sdk/openai`.
