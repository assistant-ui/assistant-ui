# Durable Pydantic AI threads

A Pydantic AI agent served over AG-UI whose threads survive a closed or crashed browser. Close the tab mid-answer, open the thread again, and the answer picks up where the stream is now and finishes. Every message shows up once.

## Run it

Server (Python 3.11+, [uv](https://docs.astral.sh/uv/)):

```sh
cd server
uv sync
uv run uvicorn main:app --port 8000
```

Without `OPENAI_API_KEY` the server uses a demo model that streams a canned answer slowly, so there is time to close the tab. Set `OPENAI_API_KEY` (and optionally `MODEL`) to use OpenAI.

Frontend:

```sh
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000, send a message, and reload the page or close the tab while the answer is streaming. Reopen the URL; it carries `?thread=<id>`.

## How it works

| Piece | Keeps | Default here | Production |
| --- | --- | --- | --- |
| `ThreadStore` | the thread transcript and whether a run is active | SQLite (`threads.db`) | Postgres: set `DATABASE_URL` and `uv sync --extra postgres` |
| Resumable stream (`assistant_stream.resumable`) | every AG-UI frame of the active run | in memory | Redis: set `REDIS_URL` |
| Pydantic AI | the agent run | in-process task | add `DBOSAgent` or `TemporalAgent` to survive server crashes |

- `POST /agent` stores the run's input, starts the run in a background task, and streams its frames from the resumable stream. A closed browser only stops the read; the run keeps going.
- When the run ends, the transcript and "not running" are written in one record.
- `GET /threads/{id}` returns the transcript and `running`. While a run is active the transcript holds only its input, so the run's output arrives once, from the stream.
- `GET /threads/{id}/stream` replays the active run from its first frame, then follows it live.
- `POST /threads/{id}/cancel` stops the run. The partial answer is kept.

On the client, `DurableHttpAgent` (`lib/durable-agent.ts`) implements AG-UI's `connect()`. When the history adapter reports a running thread, `useAgUiRuntime` rejoins the run through `agent.connectAgent()` instead of starting a new one. Stop calls `abortRun()`, which cancels the run on the server. Switching threads or unmounting only drops the connection.

## Tests

```sh
cd server && uv run pytest              # server: disconnect, reopen, cancel
pnpm exec vitest run                    # browser runtime against the real server (needs uv)
```

The server tests also run against Postgres and Redis when `DATABASE_URL` and `REDIS_URL` are set.
