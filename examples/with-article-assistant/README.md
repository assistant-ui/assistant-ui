# Article Assistant

An assistant-ui example: a news article with an `AssistantModal` launcher that answers questions about the page you're reading. The article (`src/article.ts`) is made up.

Live at [assistant-ui.com/examples/article-assistant](https://www.assistant-ui.com/examples/article-assistant).

## Features

- **AssistantModal**: a floating button opens the chat over the article, so the page stays readable
- **Suggestions**: `AuiConfig({ suggestions: Suggestions([...]) })` shows four starter questions in the empty thread
- **Grounded system prompt**: the agent's instructions hold the full article text and tell it to answer only from it, and to say so when the article doesn't cover a question
- **AI SDK runtime**: `useChatRuntime` from `@assistant-ui/react-ai-sdk` with the AI SDK's `DirectChatTransport` and a `ToolLoopAgent` (`src/runtime.ts`)

## Files

- `src/App.tsx`: the system prompt, suggestions, runtime provider and modal
- `src/ArticleView.tsx`: renders the article
- `src/components/assistant-ui/`: the registry components (`assistant-modal`, `thread` and their dependencies)

## Build

```bash
pnpm build   # dist/
```

## How this demo is hosted

The docs page runs this app as an appOS app. Its model is `apposModel()` from `appos-client/ai-sdk`, so the app holds no key and has no backend: the page that embeds it serves each model call. `apps/docs/scripts/build-appos-examples.mjs` packs `dist/` into a `.wbn` bundle, `<AppOSApp>` from `appos-host` embeds it, and `apps/docs/app/api/appos/ai` answers the model calls. `public/manifest.webmanifest` is the app's manifest. `appos-client` is linked from an appOS checkout (`link:` in `package.json`) until it is published.

To run it elsewhere, replace `useAgentRuntime` in `src/runtime.ts` with `useChatRuntime` pointed at your own chat route.
