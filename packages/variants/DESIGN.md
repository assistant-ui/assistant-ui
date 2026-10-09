# Design note: a live link to the coding agent (not built)

**Decisions so far:**

- Connecting is a skill step, `/variants connect <url>`, with no npx helper. A draft of the step is in `.claude/skills/variants/SKILL.md`.
- By default the link reuses the existing checkout Durable Object host with a `variants` binding, rather than a separate worker. That host is harness-sdk's `apps/checkout-worker`, outside this repo.

Today the hand-off is copy and paste: `/variants choose …` plus notes, either in source or after ` -- notes:`. This note proposes pushing choices, notes and "apply" to the user's coding agent as they happen, by reusing the docs setup wizard's statewire link.

## What the wizard does today

The wizard is statewire's replicated state behind a Cloudflare Durable Object. That Durable Object lives in harness-sdk's `apps/checkout-worker`, not in this repo; the docs app only has the client side, in `apps/docs/lib/checkout/*`:

- **The link:** the browser makes a random link id, stores it in localStorage and reuses it across setups. The link URL `${NEXT_PUBLIC_CHECKOUT_URL}/<id>` is the only credential.
- **Connecting the agent:** the user copies a prompt that runs `npx setup-agent <url>`.
- **Transports:** the browser joins over `StatewireWebsocket`; the agent uses `StatewireClient` with `StatewireHttp`.
- **Messages:** both sides send typed commands against one server-owned state per link. The browser sends commands such as `checkout/answer`; the agent sends commands such as `agent/hello`, `agent/heartbeat`, `agent/step`, `agent/log`, `agent/ack` and `agent/done`. The server rejects invalid transitions with a reason.
- **Presence:** the agent sends a heartbeat every 5 seconds and counts as present for 15 seconds after the last one.
- **Secrets:** they never enter the shared state; they go through `PUT <url>/secret/<inputId>`.

## Proposal

**Reuse the existing Durable Object host with a new binding, not a new service.** Statewire already routes `/<binding>/<instance>`, so variants adds a `variants` binding next to `checkout` in the same worker. Each binding has its own state schema and rules, so the two can't read or write each other's state, while deployment, websocket handling, presence and the HTTP agent transport stay shared.

**What's generic and what's specific:**

- **Generic:** the link (a random id per browser profile and project origin), the transports, presence and heartbeats, the acknowledgement pattern, and reconnecting after the machine wakes. This is worth extracting from `lib/checkout` into a small `agent-link` module that both the wizard and variants import.
- **Specific to variants:** the state schema and commands, roughly:
  - **State:** `{ origin, page, groups: [{ id, label, variants, selected, parent }], notes: [...], requests: [...], agent: { connected, lastSeenAt, status } }`
  - **Page commands:** `variants/snapshot` (mounted groups and their selections), `variants/note` and `variants/note-delete` (the session-mode notes), and `variants/request` with `{ kind: "choose", pairs } | { kind: "apply" }`.
  - **Agent commands:** `agent/hello`, `agent/heartbeat`, `agent/ack { requestId }`, `agent/status { requestId, text }` (for example "applying 2 notes…"), and `agent/done { requestId, reload?: boolean }`.

**User flow:**

1. The sidebar footer gets **Connect agent**, next to **Copy prompt**. It shows a one-line prompt, `/variants connect <url>`, for the user to paste once.
2. The skill's `connect` step joins over statewire's HTTP transport, the same `StatewireClient` + `StatewireHttp` pair the CLI uses in `packages/cli/src/lib/cloud-setup-login.ts`. It then loops: read a request, act on it, report back.
3. From then on, **Choose**, **Apply notes** and saving a note send commands instead of copying text.
4. The row shows the agent's status line. On `done` with `reload`, the page offers a reload; Vite and Next usually hot-reload by themselves.
5. Notes written into source still go through the local dev endpoints, which remain the source of truth. The link only carries intent and status.

## Security

- **Pairing is the link.** It's a bearer URL, like the wizard's. It's created in the browser and shown only to the user, and it carries no other secret. It expires after 24 hours of inactivity, and **Disconnect** rotates it.
- **Origin binding:** the first page to join records its `origin`, and the Durable Object rejects page commands from any other `Origin`. Only `http://localhost:*`, `*.localhost` and origins the app explicitly allowlists may join, because this is a dev tool.
- **Agent authority:** the agent never takes instructions from free text in the state. A request is a typed command, either `choose` with validated `group:variant` pairs or `apply`. The skill does exactly what `/variants choose` or `/variants apply` would do on a paste: the same file search, the same validation, and asking when anything is ambiguous. Note text is treated as a change request for the marked region only, never as a command to run. The agent acknowledges every request, so the page can show what was picked up.
- **Nothing in production:** the sidebar doesn't render there, and the binding refuses page joins from origins that aren't allowed.

## Open question

- A separate worker would keep apps outside assistant-ui from depending on the checkout host. It's not planned unless that becomes a requirement.
