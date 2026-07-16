# Mastra example

This example runs assistant-ui against a local Mastra server. It demonstrates:

- AI SDK-compatible agent streaming
- LibSQL-backed thread creation, switching, and message restoration
- a durable workflow with two human approval checkpoints
- workflow run restoration after a browser reload

Create `examples/with-mastra/.env.local` from `.env.example`, replace the
placeholder `OPENAI_API_KEY`, then run:

```bash
pnpm --filter with-mastra dev
```

The command starts Next.js on `http://localhost:3000` and a Mastra Hono server
on `http://localhost:4111`. Local environment and `mastra.db*` files are ignored
by Git.

The local example creates a persistent resource ID per browser. Production apps
must derive that identity from an authenticated server session and authorize
resource, thread, and workflow access on the server.
