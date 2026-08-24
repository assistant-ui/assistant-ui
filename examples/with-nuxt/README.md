# Nuxt Example

assistant-ui in a Nuxt 4 app: `@assistant-ui/vue` primitives on the client, streaming from a Nitro server route via the AI SDK.

## How it works

- `app/components/Assistant.client.vue` wires the thread with `AISDKChat()` from `@assistant-ui/ai-sdk`: the AI SDK chat runs as the `threads` scope of the assistant client, no React host required. Edit, reload, and branch switching come with it.
- `server/api/chat.post.ts` runs `streamText` over `convertToModelMessages` and returns the AI SDK UI message stream, exactly like the Next.js templates; the default `AssistantChatTransport` posts the `UIMessage` array to `/api/chat`.
- `app/components/Assistant.client.vue` mounts the provider client-only. `AuiProvider` creates its client in component setup, and Vue SSR never disposes effect scopes, so rendering it on the server would leak one runtime per request.
- React is a small runtime dependency of the AI SDK integration: `@assistant-ui/tap` installs its hook dispatcher while the chat resource renders, so `useChat`'s React hook calls route to tap and React never renders anything.
- Messages render as plain text. `@assistant-ui/vue` has no markdown renderer yet.

## Run

```sh
cp .env.example .env   # set OPENAI_API_KEY
pnpm install
pnpm dev
```

`pnpm install` runs `nuxt prepare`, which generates the `.nuxt/` directory that `tsconfig.json` extends.
