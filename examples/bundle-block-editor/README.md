# Collaborative block editor bundle

A standalone React app combining a real Lexical rich-text document with assistant-ui and the AI SDK chat runtime. Build it through the shared bundle builder, independently of the documentation app.

Downloaded source: `npm install`, `npm run build`, then `npm run preview`.

## Try the example

- Type in the draft, format text, switch a selected block between paragraph and heading, and undo or redo changes.
- Select a paragraph and ask the assistant to shorten it. Review the proposal before applying it.
- Edit that paragraph before applying its proposal. The stale proposal is rejected and the human edit is preserved.
- Add next steps to append a paragraph without replacing existing blocks.
- Ask for a summary to read the first sentence of each current paragraph, including human changes.

## Local demo boundary

The preview uses the shared browser-local AI SDK transport. It makes no model request. Rewrite is a deterministic phrase substitution and two-sentence limit; summary extracts the first sentence of each paragraph; next steps uses explicitly authored sample project text. Arbitrary natural-language editing requires an application-provided model transport.

The integration seam is `assist` in `src/main.tsx`: return a proposal from a model or tool result while retaining review and apply. A rewrite proposal includes its source node key, exact source text, and serialized block fingerprint. Applying compares the current block inside the Lexical update transaction. Changed text, formatting, block type, or a deleted node rejects the proposal; an append targets the current root. Accepted rewrites replace the block's text with plain text. Updates use Lexical's history so users can undo accepted changes. This example does not implement networked multi-user synchronization.

The history plugin is seeded with the initialized draft so the first accepted suggestion is undoable. Run the regression contract with `node --test examples/bundle-block-editor/history.test.mjs` from the repository root; it checks first-apply undo, redo, and human editing after an undone suggestion.

## Components and packages

- `LexicalComposer`, `RichTextPlugin`, `ContentEditable`, and `HistoryPlugin` own document editing and history.
- The shared `PreviewChat` composes assistant-ui thread, messages, composer, and suggestions with `@assistant-ui/ai-sdk`.
- No documentation-module import, backend, account, or secret is required.

Detail-page links supported by the current content inventory: `/docs/primitives/thread`, `/docs/primitives/composer`, `/docs/primitives/suggestion`, and `/docs/runtimes/ai-sdk/v7`.
