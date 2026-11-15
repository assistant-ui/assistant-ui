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
   npm install
   npm run dev
   ```

   Any package manager works — substitute `pnpm`, `yarn` or `bun` if you
   scaffolded with one of those.

   - `localhost:2024` — LangGraph dev server (serves the `agent` graph)
   - `localhost:3000` — Next.js app (proxies `/api/*` → `LANGGRAPH_API_URL`)

   Run them individually with `npm run dev:backend` and `npm run dev:frontend`.

## Project layout

```
app/                Next.js App Router pages + /api proxy
backend/agent.ts    LangGraph graph exported as `graph`
langgraph.json      LangGraph CLI config (graph id, node version, env file)
```

`app/assistant.tsx` builds the runtime with `useStreamRuntime({ assistantId, apiUrl })` from `@assistant-ui/react-langchain`, which wraps `useStream` from `@langchain/react`.

## Deployment security

The bundled proxy in `app/api/[..._path]/route.ts` adds `LANGCHAIN_API_KEY` to the requests it forwards, so the key never reaches the browser. It limits what it forwards:

- Only the calls the chat UI makes: `POST threads`, `GET threads/<id>/state`, and `POST` to a thread's `runs/stream`, `runs/<run>/cancel`, `history`, `commands` and `stream/events`. Other paths and methods get 404.
- Only requests with `Sec-Fetch-Site: same-origin`, which browsers send on fetches from this app's pages. Requests without that header, such as curl or other servers, get 403.

These checks are not user authentication. With the server key, the proxy can reach every thread on the deployment. Before deploying with a cloud API key:

1. Require your application session in the route and apply a durable rate limit.
2. Scope threads to the signed-in user. On `POST threads`, set `metadata.owner` to the user id on the server, replacing any value the client sent. For every `threads/<id>/...` path, read the thread with the server key and forward the request only when `metadata.owner` matches the user.
