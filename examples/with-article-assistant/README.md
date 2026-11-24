# Article Assistant

An assistant-ui example: a news article with an `AssistantModal` launcher that answers questions about the page you're reading. The article (`lib/article.ts`) is made up.

Live at [assistant-ui.com/examples/article-assistant](https://www.assistant-ui.com/examples/article-assistant).

## Features

- **AssistantModal**: a floating button opens the chat over the article, so the page stays readable
- **Suggestions**: `AuiConfig({ suggestions: Suggestions([...]) })` shows four starter questions in the empty thread
- **Grounded system prompt**: the route's system prompt holds the full article text and tells the model to answer only from it, and to say so when the article doesn't cover a question
- **AI SDK runtime**: `useChatRuntime` from `@assistant-ui/ai-sdk` with `AssistantChatTransport`, and a route handler (`app/api/chat/route.ts`) that calls `streamText` with a plain model string, `"openai/gpt-5"`

## Files

- `app/page.tsx`: the article (a server component) inside the assistant
- `components/assistant.tsx`: the runtime, suggestions and modal
- `app/api/chat/route.ts`: the system prompt and the model call
- `components/article-view.tsx`, `lib/article.ts`: the article
- `components/assistant-ui/`: the registry components (`assistant-modal`, `thread` and their dependencies)

## Run

```bash
pnpm dev     # needs AI_GATEWAY_API_KEY (Vercel AI Gateway), or deploy to Vercel
pnpm build
```

## How this demo is hosted

The docs page runs this same app as an appOS app, with no changes to its code. appOS's Next.js build adapter (`@assistant-ui/appos/next`, set through `NEXT_ADAPTER_PATH`) writes the build as an appOS app folder:

- the prerendered page and its assets go in the bundle;
- the route handler runs in the app's own sandboxed origin;
- the model string goes to appOS's AI gateway in place of Vercel's, so the app holds no key.

`apps/docs/scripts/build-appos-examples.mjs` builds and packs the app into a `.wbn` bundle. `<AppOSApp>` from `@assistant-ui/appos` embeds it, and `apps/docs/app/api/appos/ai` serves its model calls. `app/manifest.ts` is the app's manifest. Dark mode uses shadcn's class-based `.dark`: the page passes the docs theme as `colorScheme`, and appOS's sandbox puts the `dark` class on `<html>` before the app's first paint. It installs from npm as `@assistant-ui/appos`.
