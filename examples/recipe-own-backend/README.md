# Recipe: Connect the chat to your own backend

A chat UI that streams replies from a backend endpoint with its own request format, through `LocalRuntime` and one `ChatModelAdapter`. The walkthrough is the [Connect the chat to your own backend](https://www.assistant-ui.com/docs/recipes/own-backend) recipe.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='recipe-own-backend^...'
OPENAI_API_KEY=sk-... pnpm --filter recipe-own-backend dev
```

Say hello. The reply streams from `app/api/backend/chat`, which stands in for your backend.

## Test it

`pnpm --filter recipe-own-backend test` runs the adapter against the backend route with a scripted model, so it needs no API key.
