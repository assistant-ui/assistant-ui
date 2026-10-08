# Website corner assistant

A real corner launcher opens an accessible non-modal conversation next to a sample gardening article. Escape and the close button return focus to the launcher. Scripted answers quote or summarize the article and identify their source section. Unknown queries explain the supported topics. No external model call or credentials.

In the monorepo: `pnpm build:bundles`, then `pnpm package:bundles`. Downloaded source: `npm install`, `npm run build`, `npm run preview`.

For live AI, pass article text to your server-side AI SDK chat route and use `DefaultChatTransport` instead of the local preview transport. The existing `/examples/modal` pattern demonstrates assistant-ui modal placement.
