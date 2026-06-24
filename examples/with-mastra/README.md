# Mastra Integration Example

This example demonstrates `@assistant-ui/react-mastra` with:

- Mastra agents backed by OpenAI.
- Mastra memory with LibSQL thread storage.
- A suspend/resume hiring workflow.
- assistant-ui runtime extras for agent selection, memory state, and workflow state.

## Setup

```bash
pnpm install
cp .env.local.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local`. `LIBSQL_URL` is optional and defaults to
`file:./mastra.db`.

## Run

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Runtime Shape

The client runtime is configured in `app/MyRuntimeProvider.tsx`:

```tsx
const runtime = useMastraRuntime({
  api: "/api/chat",
  agentId: selectedAgent,
  memory: {
    userId: "default-user",
  },
});
```

The chat route accepts `agentId`, `messages`, `threadId`, and `resourceId`, then
streams Mastra events back to the browser. The workflow routes use Mastra 1.x
`createRun`, `start`, `resume`, and `watch` APIs.
