# assistant-ui + Flue

This example runs a Flue server and renders one durable conversation with `useFlueRuntime()` from `@assistant-ui/react-flue`.

The demo uses Flue's scripted provider, so it runs without an API key. Every prompt streams a server-side tool call, a live `data-jobProgress` card, and a final answer into the stock assistant-ui thread.

```bash
pnpm install
pnpm --filter with-flue dev
```

Open [http://localhost:5173](http://localhost:5173), then send a message or select a suggestion. The conversation id is stored in the browser so a reload reconnects to the same durable history. Use **New conversation** to generate a fresh id.

The routes in this demo are intentionally unauthenticated and are only suitable for local development. Production Flue applications should protect the agent mount with application middleware.
