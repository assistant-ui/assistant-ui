# SvelteKit Example

assistant-ui in a SvelteKit app: `@assistant-ui/svelte` builders on the client, streaming from a SvelteKit server route via the AI SDK.

## How it works

- `src/routes/+page.svelte` wires the thread with `AISDKChat()` from `@assistant-ui/ai-sdk`: the AI SDK chat runs as the `threads` scope of the assistant client, no React host required. Edit, reload, and branch switching come with it.
- `src/routes/api/chat/+server.ts` runs `streamText` over `convertToModelMessages` and returns the AI SDK UI message stream, exactly like the Next.js templates; the default `AssistantChatTransport` posts the `UIMessage` array to `/api/chat`.
- `src/routes/+layout.ts` disables SSR. `provideAui` creates the runtime client in component init, so rendering on the server would build a throwaway runtime per request for a page that is entirely client-driven.
- React is a small runtime dependency of the AI SDK integration: `@assistant-ui/tap` installs its hook dispatcher while the chat resource renders, so `useChat`'s React hook calls route to tap and React never renders anything.
- Messages render as plain text. `@assistant-ui/svelte` has no markdown renderer yet.

## Run

```sh
cp .env.example .env   # set OPENAI_API_KEY
pnpm install
pnpm dev
```

`pnpm install` runs `svelte-kit sync`, which generates the `.svelte-kit/` directory that `tsconfig.json` extends.
