# appOS App

An assistant-ui chat that runs as an appOS app: the Article Assistant, a made-up news feature (`src/article.ts`) with a chat beside it that answers questions about it.

- **Runtime:** `useChatRuntime` from `@assistant-ui/react-ai-sdk` with the AI SDK's `DirectChatTransport` (`src/appos-runtime.ts`). The agent loop runs in the app's frame.
- **Model:** `apposModel()` from `appos-client/ai-sdk`. The shell that runs the app serves each model call and holds the key, so the app has no key and no backend.
- **Shell:** appOS itself, or a website that embeds the app with `<AppOSApp>` from `appos-host`. The assistant-ui docs do the second on `/examples/appos`: `apps/docs/scripts/build-appos-examples.mjs` packs `dist/` into an unsigned `.wbn`, and `/api/appos/ai` serves the model calls.

## Build

```bash
pnpm build   # dist/: index.html, assets, manifest.webmanifest, icon.svg
```

`public/manifest.webmanifest` is the app's manifest; its `appos` key holds the appOS fields.

`appos-client` and `appos-host` are linked from an appOS checkout (`link:` in `package.json`) until they are published.
