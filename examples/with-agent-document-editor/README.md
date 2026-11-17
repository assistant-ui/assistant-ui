# Agent Document Editor Example

A rich text document that you and an assistant edit together. Chat with the assistant from a composer docked under the page, or highlight a passage and ask about just that. The assistant's edits stream into the document as it writes them, and both of you can leave comments and roll the document back to an earlier version.

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
| Runtime, interactables scope, persistence and suggestions | `app/page.tsx` |
| Model call, with the document, comments and quoted passage passed to the model | `app/api/chat/route.ts` |
| The `document` and `comments` interactables: schemas and descriptions for the model | `lib/document-state.ts` |
| Registering both interactables for as long as the page is open | `components/workspace.tsx` |
| Two-way sync between the Lexical editor and the `document` interactable | `components/editor/document-sync.tsx` |
| Converting between editor content and blocks | `lib/blocks.ts` |
| Toolbar on highlighted text: Ask AI, quick actions, Comment | `components/editor/selection-toolbar.tsx` |
| Marks on commented passages | `components/editor/comment-highlights.tsx` |
| Docked chat composed from thread, message and composer primitives | `components/chat/chat-dock.tsx`, `components/chat/messages.tsx` |
| Inline marker for each `update_document` call, with View changes and Undo | `components/chat/edit-marker.tsx` |
| Version list with a diff per changed block and Restore | `components/panels/history-panel.tsx` |
| Comment threads with reply, resolve and delete | `components/panels/comments-panel.tsx` |
| Key button, key storage and the model list | `components/api-keys.tsx`, `lib/api-keys.ts`, `lib/models.ts` |

## How it works

### The document is an interactable

The document is state the user and the model both write to. `unstable_useInteractable("document", ...)` registers it with a schema of a title and an ordered list of blocks, each with an `id`, a `type` and inline markdown `text`. assistant-ui generates an `update_document` tool from that schema, so there is no hand-written edit tool. The model sends only what changes (`blocks.update`, `blocks.add`, `blocks.remove`, or `blocks.set` to insert or reorder), and the arguments are applied to the state as they stream.

`DocumentSync` connects that state to the Lexical editor in both directions. What you type is serialized to blocks and written to the interactable; what the model writes there is patched into the editor block by block, which is why a rewrite types itself into one paragraph while the rest of the page stays still. The editor is read-only while a run is in progress.

On the server, `unstable_injectInteractableContext` turns the state snapshots attached to each user message into text the model can read.

### Asking about a highlighted passage

assistant-ui's `SelectionToolbarPrimitive` works on text inside chat messages, so the editor has its own floating toolbar. It still uses the composer's quote: **Ask AI** calls `aui.thread.composer().setQuote()` with the highlighted text and renders a second `ComposerPrimitive.Input` at the selection. That input and the docked composer are two views of the same thread composer, so the passage shows up in the dock as a quote too. The block id rides along where a chat quote would carry a message id, and the route tells the model which block the passage is in.

**Improve** and **Shorten** skip the input and send a prepared message with the same quote through `aui.thread.append()`.

### Comments

Comments are a second interactable, so the assistant can add and resolve them with the generated `update_comments` tool and reads the ones you leave. Each comment stores a block id and the quoted passage. Marks in the page are painted with the CSS Custom Highlight API from those two values, so a comment never changes the document.

### History

`unstable_useInteractableVersions` returns every recorded version of the document: your edits as of each message you send, and each `update_document` call. The History panel lists them, shows a diff for every block a version changed, and restores one with `version.restore()`. The **Undo** link on the newest edit in the chat restores the version before it.

## Limits

- History covers the current chat. The document and comments are saved to local storage and survive a reload; the chat and the version list do not.
- Lists are flat, and there are no images or tables.
- Two tabs on the same document do not update each other until one reloads.
