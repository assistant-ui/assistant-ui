# Simple AI SDK chat

A complete assistant-ui conversation using the real `useChatRuntime` integration. The local preview uses an AI SDK `ChatTransport` that returns scripted UI message chunks in the browser. It does not call a model or persist conversations.

In the monorepo: `pnpm build:bundles`, then `pnpm package:bundles`.

Downloaded source: `npm install`, `npm run build`, `npm run preview`.

For a live provider, replace the shared local transport with `DefaultChatTransport` pointing at a server chat route. See the existing `examples/with-ai-sdk-v7` app and `/docs/runtimes/ai-sdk/v7`. Provider secrets belong on the server.
