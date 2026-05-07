# Agent Playground Backend

It is the live backend for the assistant-ui Agent playground. It is intentionally a separate long-running Node service instead of a Next.js route handler.

## Local Development

```bash
pnpm --filter @assistant-ui/agent-playground-backend dev
```

The docs app should call the same-origin `/api/agent/*` proxy route. The docs server reads `AGENT_BACKEND_URL` and forwards requests to this backend.

## Secret Handling

Only commit `.env.example`. Do not commit `.env`, `.env.local`, or copied private validation env files.
