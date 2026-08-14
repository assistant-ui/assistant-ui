# SvelteKit Example

assistant-ui in a SvelteKit app: `@assistant-ui/svelte` builders on the client, streaming from a SvelteKit server route via the AI SDK.

## How it works

- `src/routes/api/chat/+server.ts` runs `streamText` and returns the AI SDK UI message stream, like the Next.js templates. The request body differs: this client posts a plain `ModelMessage` array built with `getThreadMessageText`, not the `UIMessage` array the templates post.
- `src/lib/runtime.ts` is a `ChatModelAdapter` that posts the conversation to the route and pipes the response through `UIMessageStreamDecoder` and `AssistantMessageAccumulator` from `assistant-stream` into a `LocalRuntimeCore`. Edit, reload, and branch switching come with it.
- `src/routes/+layout.ts` disables SSR. `provideAui` creates the runtime client in component init, so rendering on the server would build a throwaway runtime per request for a page that is entirely client-driven.
- `vite.config.ts` aliases `react` to `@assistant-ui/tap/standalone-shim`, so the app runs without React installed.
- Messages render as plain text. `@assistant-ui/svelte` has no markdown renderer yet.

## Run

```sh
cp .env.example .env   # set OPENAI_API_KEY
pnpm install
pnpm dev
```

`pnpm install` runs `svelte-kit sync`, which generates the `.svelte-kit/` directory that `tsconfig.json` extends.
