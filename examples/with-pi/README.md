# assistant-ui × Pi

A minimal local harness for the [`@assistant-ui/react-pi`](../../packages/react-pi)
adapter, driving the [Pi coding agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
in-process.

It demonstrates the MVP surface: a thread list, new sessions, a composer with
steer / follow-up / stop, streaming assistant responses (text + reasoning), tool
cards with streaming output, the blocking host-UI dialogs (confirm / input /
select / editor), a model + credential readiness banner, a context-usage
indicator, and a read-only workspace browser (`components/workspace-browser.tsx`
backed by `/api/pi/fs`) for inspecting the agent's working directory. It proves
the adapter surface, not a full desktop app shell.

## How it fits together

```
browser                         server (Next.js, Node runtime)
─────────                       ──────────────────────────────
usePiRuntime                    app/api/pi/**            ← route layer
  └ createPiHttpClient  ──HTTP──▶ piClient = createPiNodeClient(...)
       (fetch + SSE)               └ PiThreadSupervisor → Pi SDK (AgentSession)
```

`createPiHttpClient` and the route layer are two halves of one `PiClient`
contract: the browser talks HTTP/SSE, the server runs the SDK in-process behind
the process-singleton supervisor.

## Model resolution

Resolution mirrors Pi's own `createAgentSession`: if you set
`PI_PROVIDER` + `PI_MODEL_ID` they win; otherwise the server falls back to Pi's
configured default (`settings.json`'s `defaultProvider`/`defaultModel`). So if
you're authenticated with `pi` and have a default model picked, **no env is
required**. The resolved model is handed to every new session and seeds the
in-app **model selector** (via `@assistant-ui/ui`'s `ModelSelector`) and the
readiness banner's credential check. The selector is wired to Pi's per-thread
`setModel`, and the composer exposes Pi's thinking-level control. Set
`PI_CODING_AGENT_DIR` to point at a non-default agent config dir (defaults to
`~/.pi/agent`).

## Run it

1. Authenticate Pi once and pick a default model (writes `~/.pi/agent/`):

   ```bash
   pnpm dlx @earendil-works/pi-coding-agent
   ```

2. Start it (no env needed if Pi has a default model):

   ```bash
   pnpm dev
   ```

   To override the model or workspace, copy `.env.example` to `.env.local` and
   set `PI_PROVIDER` / `PI_MODEL_ID` / `PI_WORKSPACE_PATH`.

The agent reads and writes files and runs shell commands in `PI_WORKSPACE_PATH`.
Point it at a scratch directory.
