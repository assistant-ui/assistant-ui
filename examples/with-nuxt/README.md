# Nuxt Example

assistant-ui in a Nuxt 4 app: `@assistant-ui/vue` primitives on the client, streaming from a Nitro server route via the AI SDK.

## How it works

- `server/api/chat.post.ts` runs `streamText` and returns the AI SDK UI message stream, like the Next.js templates. The request body differs: this client posts a plain `ModelMessage` array built with `getThreadMessageText`, not the `UIMessage` array the templates post.
- `app/utils/runtime.ts` is a `ChatModelAdapter` that posts the conversation to the route and pipes the response through `UIMessageStreamDecoder` and `AssistantMessageAccumulator` from `assistant-stream` into a `LocalRuntimeCore`. Edit, reload, and branch switching come with it.
- `app/components/Assistant.client.vue` mounts the provider client-only. `AuiProvider` creates its client in component setup, and Vue SSR never disposes effect scopes, so rendering it on the server would leak one runtime per request.
- `nuxt.config.ts` aliases `react` to `@assistant-ui/tap/standalone-shim`, so the app runs without React installed.
- Messages render as plain text. `@assistant-ui/vue` has no markdown renderer yet.

## Run

```sh
cp .env.example .env   # set OPENAI_API_KEY
pnpm install
pnpm dev
```

`pnpm install` runs `nuxt prepare`, which generates the `.nuxt/` directory that `tsconfig.json` extends.
