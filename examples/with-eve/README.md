# assistant-ui + Eve

This example mounts an Eve agent into a Next.js app with `withEve()` from `eve/next`, then adapts Eve's React hook into assistant-ui with `useEveAgentRuntime()`.

## Setup

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`:

```bash
cp .env.example .env.local
```

```bash
pnpm --filter with-eve dev
```

The key has to match whichever provider `model` names in `agent/agent.ts`: this example uses `openai("gpt-5.5")` from `@ai-sdk/openai`, so it reads `OPENAI_API_KEY`. Point `model` at another provider and set that provider's key instead.

The Eve channel is served on the same origin as the Next app, so the browser UI does not need a separate agent URL.
