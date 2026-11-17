# Agent Document Editor Example

A rich text document that you and an assistant edit together. Chat with the assistant in a resizable panel beside the page, by typing or by voice, or highlight a passage and ask about just that. The assistant's edits are typed into the document itself, with a shimmer on the block it is rewriting and the newest words in the live color, and both of you can leave comments and roll the document back to an earlier version. A share link carries the document to someone else.

## Run it

From the monorepo root:

```bash
pnpm install
pnpm --filter with-agent-document-editor dev
```

Open [http://localhost:3000](http://localhost:3000).

### Model keys

The example needs a key for at least one provider. There are two ways to give it one:

- Click the round key button at the top right and paste a key for OpenAI, Anthropic or Google. The key is kept in your browser's local storage and sent only to this app's own `/api/chat` route, which uses it for that request and does not store it.
- Or copy `.env.example` to `.env.local` and set a key there. A key from the key button wins over one from the environment.

The model picker in the composer lists only the models whose provider has a key.

## What the example demonstrates

| Concern | Where it lives |
|---|---|
| Runtime, dictation adapter, interactables scope, persistence and suggestions | `app/page.tsx` |
| Model call, with the document, comments and quoted passage passed to the model | `app/api/chat/route.ts` |
| The `document` and `comments` interactables: schemas and descriptions for the model | `lib/document-state.ts` |
| Registering both interactables for as long as the page is open, and the resizable panel beside the document | `components/workspace.tsx` |
| Two-way sync between the Lexical editor and the `document` interactable | `components/editor/document-sync.tsx` |
| How a streamed edit reaches the page: hold, then type over the old text | `lib/streaming.ts` |
| The shimmer, live color and caret drawn over the page | `components/editor/stream-paint.ts` |
| Converting between editor content and blocks | `lib/blocks.ts` |
| Toolbar on highlighted text: Ask AI with its one-click rewrites, Comment, text style, formatting, lists, link | `components/editor/selection-toolbar.tsx` |
| Menu of blocks to insert, opened by typing `/` | `components/editor/slash-menu.tsx` |
| Formatting commands shared by the toolbars and the slash menu | `components/editor/editor-commands.tsx` |
| Marks on commented passages | `components/editor/comment-highlights.tsx` |
| Chat panel: messages, chats menu, and naming each chat | `components/chat/chat-panel.tsx` |
| Composer: model picker, dictation, suggestions behind `/` | `components/chat/chat-composer.tsx` |
| Messages in the chat | `components/chat/messages.tsx` |
| Inline marker for each `update_document` call, with View changes and Undo | `components/chat/edit-marker.tsx` |
| Version list with a diff per changed block and Restore | `components/panels/history-panel.tsx` |
| Comment threads with reply, resolve and delete | `components/panels/comments-panel.tsx` |
| Share dialog, and opening a shared document | `components/share-dialog.tsx`, `lib/share.ts` |
| Key button, key storage and the model list | `components/api-keys.tsx`, `lib/api-keys.ts`, `lib/models.ts` |

## How it works

### The document is an interactable

The document is state the user and the model both write to. `unstable_useInteractable("document", ...)` registers it with a schema of a title and an ordered list of blocks, each with an `id`, a `type` and inline `text`. The text is markdown for bold, italic, strikethrough, code and links, plus `<u>` and `<mark>` for underline and highlight, which markdown has no syntax for. assistant-ui generates an `update_document` tool from that schema, so there is no hand-written edit tool. The model sends only what changes (`blocks.update`, `blocks.add`, `blocks.remove`, or `blocks.set` to insert or reorder), and the arguments are applied to the state as they stream.

`DocumentSync` connects that state to the Lexical editor in both directions. What you type is serialized to blocks and written to the interactable; what the model writes there is patched into the editor block by block, so the rest of the page stays still. The editor is read-only while a run is in progress.

### Showing an edit as it happens

The state changes token by token, but half a sentence with an unclosed `**` is not something to put on the page. `lib/streaming.ts` decides what the page shows instead:

1. While the new text for a block is arriving, the block keeps its old text. Once the new text differs from the old, the block shimmers.
2. When the new text is whole, it is typed over the old at a steady pace. The old text stays behind the caret, dimmed, until it is overwritten, so the block never collapses.
3. A new block appears as a shimmering bar and is typed in the same way.

The effect is drawn by `stream-paint.ts` with the CSS Custom Highlight API and one caret element, in the manner of the Streaming text element: the newest words take the live color and fade back to ink. Nothing is added to the document for it. With reduced motion turned on, the text lands at once.

On the server, `unstable_injectInteractableContext` turns the state snapshots attached to each user message into text the model can read.

### The panel beside the document

Chat, Comments and History share one panel on the right, opened from the buttons at the top. The document and the panel are the two halves of the kit's `ResizablePanelGroup`, so the edge between them drags, and takes the arrow keys when it has focus. On a screen too narrow for both, the panel lies over the document.

The chat is built from `ThreadPrimitive` and `ComposerPrimitive`. The thread's suggestions are not shown as chips: typing `/` lists them through `ComposerTriggerPopover` and `unstable_useSlashCommandAdapter`, and choosing one sends it. The Chats button lists the runtime's threads, so a new chat does not lose the old one.

### Dictation

`app/page.tsx` gives the runtime a `WebSpeechDictationAdapter` where the browser can recognize speech, read through `useSyncExternalStore` so that the server render goes without it. The composer then shows `ComposerPrimitive.Dictate`. While it listens, the words land in the input as they are recognized and the kit's `ComposerVoice` waveform takes the model picker's place, next to `ComposerPrimitive.StopDictation`.

### Asking about a highlighted passage

assistant-ui's `SelectionToolbarPrimitive` works on text inside chat messages, so the editor has its own floating toolbar. It still uses the composer's quote: **Ask AI** calls `aui.thread.composer().setQuote()` with the highlighted text and renders a second `ComposerPrimitive.Input` at the selection. That input and the composer in the chat panel are two views of the same thread composer, so the passage shows up there as a quote too. The block id rides along where a chat quote would carry a message id, and the route tells the model which block the passage is in.

Under that input are one-click changes (improve, fix spelling, shorten, lengthen, simplify), narrowed by what you type. Choosing one skips the input and sends a prepared message with the same quote through `aui.thread.append()`.

### Inserting blocks

Typing `/` in the document opens a menu of everything that can be inserted: text, headings, lists, a quote, a divider, and a shortcut that moves the caret to the assistant's composer. It is Lexical's typeahead plugin; the entries call the same commands as the toolbars.

### Comments

Comments are a second interactable, so the assistant can add and resolve them with the generated `update_comments` tool and reads the ones you leave. Each comment stores a block id and the quoted passage. Marks in the page are painted with the CSS Custom Highlight API from those two values, so a comment never changes the document.

### History

`unstable_useInteractableVersions` returns every recorded version of the document: your edits as of each message you send, and each `update_document` call. The History panel lists them, shows a diff for every block a version changed, and restores one with `version.restore()`. The **Undo** link on the newest edit in the chat restores the version before it.

### Sharing

There is no server to keep a document on, so the Share dialog makes a link that holds the document itself, in the fragment of the address, which a browser does not send anywhere. Opening such a link offers to replace the document in that browser with the one from the link, through the interactable's `setState`. The dialog also copies or downloads the document as Markdown.

## Limits

- History covers the current chat. The document and comments are saved to local storage and survive a reload; the chat and the version list do not.
- Lists are flat, and there are no images or tables.
- Two tabs on the same document do not update each other until one reloads.
- A share link is as long as the document it holds, and it carries the text only, not the comments or the chat.
- Dictation uses the browser's own speech recognition, which Firefox does not have.
