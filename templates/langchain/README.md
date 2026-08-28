This is the [assistant-ui](https://github.com/assistant-ui/assistant-ui) starter project for LangGraph. It ships a minimal Claude-backed agent (`backend/agent.ts`) plus a Next.js chat UI that streams from it.

## Getting Started

1. Copy env template and fill in secrets:

   ```bash
   cp .env.example .env.local
   ```

   Required:
   - `ANTHROPIC_API_KEY` — used by `backend/agent.ts`

   Optional:
   - `ANTHROPIC_MODEL` — override the default model id
   - `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` — tracing
   - `LANGCHAIN_API_KEY` — only needed when pointing `LANGGRAPH_API_URL` at LangGraph Platform (cloud)

2. Install deps and run both the LangGraph backend and the Next.js frontend:

   ```bash
   pnpm install
   pnpm dev
   ```

   - `localhost:2024` — LangGraph dev server (serves the `agent` graph)
   - `localhost:3000` — Next.js app (proxies `/api/*` → `LANGGRAPH_API_URL`)

   Run them individually with `pnpm dev:backend` and `pnpm dev:frontend`.

## Project layout

```
app/                Next.js App Router pages + /api proxy
backend/agent.ts    LangGraph graph exported as `graph`
langgraph.json      LangGraph CLI config (graph id, node version, env file)
```

`app/assistant.tsx` builds the runtime with `useStreamRuntime({ assistantId, apiUrl })` from `@assistant-ui/react-langchain`, which wraps `useStream` from `@langchain/react`.

## Deployment security

The bundled proxy accepts same-origin browser requests so the local starter works without exposing `LANGCHAIN_API_KEY` to the client. If a reverse proxy rewrites the request URL, set `APP_ORIGIN` to the externally visible origin, such as `https://chat.example.com`. Origin checks are not user authentication. Before deploying with a cloud API key, require your application session in `app/api/[..._path]/route.ts` and apply a durable rate limit.
