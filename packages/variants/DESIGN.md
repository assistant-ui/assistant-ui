# Design note: the local agent link

The default hand-off is copy and paste: `/variants choose …` plus notes, either in source or after ` -- notes:`. The agent link sends the same requests straight to a coding agent working in the same checkout, and shows its progress on the sidebar rows. It adds no separate server, port or service: the dev endpoint that already writes notes into source is the only server (the agent runs one background listener of its own), the page talks to it, and the agent talks to the filesystem.

## Mailbox

The dev endpoint (`@assistant-ui/variants/vite` or `/next`) keeps a mailbox in `.variants/` at the app root (Vite's `root`, or the Next app's working directory). The sidebar's first `GET /__variants/ping` creates the directory. Add `.variants/` to the app's `.gitignore`; this repository's root `.gitignore` already has it.

| File | Written by | Contents |
| --- | --- | --- |
| `inbox.jsonl` | the dev endpoint | one request per line: `{ id, ts, kind: "choose" \| "apply", pairs, notes, page }` |
| `outbox.jsonl` | the agent | one event per line: `{ id, ts, re, type: "ack" \| "status" \| "done", text?, ok?, reload? }` |
| `agent.json` | the agent | `{ kind, cwd, startedAt, pid? }`, touched every 5 seconds as a heartbeat |

- **Append-only JSONL within a session:** each side only appends to its own file, so there are no read-modify-write races, and a partial last line is skipped. The endpoint serializes its appends and refuses a symlinked `.variants/` or mailbox file (409).
- **Ids are time-ordered** (`r-<base36 ms>-<hex>` for requests, `o-<epoch ms>-<n>` for events), so each side resumes after the last id it saw. When that id is gone (the files were rotated), the reader starts from the top.
- **Presence** is `agent.json`'s mtime: the agent counts as connected while the file was touched in the last 15 seconds. When the agent's session ends, its heartbeat stops and the sidebar stops showing it within 15 seconds.
- **Caps:** the endpoint refuses a request that would grow the inbox past 1 MiB (507) and reads at most the last 1 MiB of the outbox.
- **Reconnecting** keeps queued work: `/variants connect` first handles every request without a `done` event, then listens from the inbox's current line count, so nothing sent in between is skipped. It truncates both files only when nothing is left unhandled.

## Endpoints

- `GET /__variants/agent?after=<event id>` returns `{ connected, agent, events }`, with the outbox events after `after`.
- `POST /__variants/agent/requests` appends a request and returns `{ id }`. It answers 409 when no agent is connected, so the page falls back to **Copy prompt**.

## Page

- While the sidebar is open and the endpoints answer, the sidebar polls `GET /agent` every 1.5 seconds. Polling is simpler than SSE across both adapters, and the files are small.
- When an agent is connected, the header shows **Agent connected**, the footer gets **Send to agent** (a `choose` request for every mounted group), and the note editor gets **Save & send** (saves the note, then sends an `apply` request scoped to that group; the agent applies only that group's notes).
- Each event updates the status line under the rows its request covered. A `done` event with `reload: true` reloads the page; Vite and Next usually hot-reload without it.
- **Copy prompt** stays, and it's the only hand-off when no agent is connected.

## Agent

`/variants connect` and `/variants disconnect` are skill steps (`.claude/skills/variants/SKILL.md`), with no helper script:

1. Find the app's `.variants/` directory, write `agent.json`, and handle every request that has no `done` event yet (rotating both files only when none are left).
2. Run one background command that touches `agent.json` every 5 seconds and runs `tail -n +<N+1> -F .variants/inbox.jsonl`, where N is the inbox's line count from step 1. In Claude Code, run it with `run_in_background` and watch its output with the Monitor tool, so each new line wakes the session.
3. For each request, append an `ack`, do exactly what the pasted `/variants choose` or `/variants apply <groups from pairs>` would do (an `apply` touches only the groups it names), then append `done`.
4. An agent without background notifications polls instead: it reads the inbox after the last id it handled at the start of each turn, or on `/variants apply`.

## Security

- **The same guards as the note endpoints:** development only, the `Host` must be loopback or explicitly allowed (this stops DNS rebinding), the `x-variants` header, same-origin, JSON bodies of at most 64 KB, and validated ids and lengths.
- **Typed requests only:** the endpoint accepts exactly what a pasted command could say: `choose` with 1 to 50 `group:variant` pairs, or `apply`, plus notes validated like `POST /notes`. The agent validates each line again and ignores anything else.
- **Note text is untrusted data.** It describes a UI change to the marked region only, never a command to run, a file to touch outside the region, or a change of scope. When a note asks for more, the agent shows it to the user before acting.
- **Mailbox contents:** requests include the page URL and the notes, so keep secrets out of both.
- **Production:** `<Variants>` throws there unless `allowInProduction` (or `VARIANTS_ALLOW_IN_PRODUCTION`) is set for a preview deployment, and the endpoints answer 404 regardless.
