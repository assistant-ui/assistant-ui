# Agent checkout: decisions I made without you

Delete this file when resolved. Each item is a call I made to keep moving; say the word and I change it.

## This round (plan phase, agent-declared steps, deploy)

1. **The worker is live at `https://checkout.assistant-ui.com`** (Cloudflare worker `agent-checkout` on the assistant-ui account, custom domain route in `apps/checkout-worker/wrangler.jsonc`). Production docs default to it; development still defaults to `http://localhost:8791`; `NEXT_PUBLIC_CHECKOUT_URL` overrides both. Nothing is authenticated yet: anyone with a session URL can join it.
2. **The host enforces the two phases, not just the prompt.** `agent/add-step`, `agent/step` and `agent/done` are rejected with `plan-required` until the user approves a plan; `agent/plan` is rejected once installing. Status goes waiting → planning (agent joins) → installing (plan approved) → done. Old v1 snapshots are dropped on restore rather than migrated, since none shipped.
3. **Plans are markdown, not a schema.** The CLI instructions ask for `## What I found` (bullets shaped `- **Label:** value`), `## What I will install`, `## Steps`, `## Open questions`, under 30 lines. The browser renders any markdown; a `**Label:**` bullet gets a label column, headings become small eyebrows. Nothing breaks if the agent ignores the shape. Revisions stack (`plans[]`); "Request changes" requires feedback text and the agent's `plan --wait` returns it.
4. **Steps are declared by the agent** (`add-step`, ids `s1`…) after approval; the catalog seeds none and the `checkout.steps` product field is gone. Progress counts done + skipped over declared steps, so the header badge only appears once the agent declared something (or when you are needed).
5. **Every answer can carry a note** and choice inputs have a "Something else" tile for free text (the CLI reports `custom: true`). Text, choice and model cards share `input-shared.tsx` (`useInputActions`, `NoteField`, `SubmitRow`).
6. **Agent connection is a status strip**, not timeline entries: icon with a dot (grey not connected, pulsing waiting, green connected, amber gone quiet, black finished), name, cwd or last-seen. The strip expands with the connect card, the waiting hints or the re-run command as needed. Below it: a **Plan** section (planning log, questions, plan card with revision history) and an **Install** section (every declared step, pending ones muted, logs and questions under the step they belong to, final "Installed"/"Cancelled" entry). "Installed" still waits for you to press Finish.
7. **`agent-checkout` is still not on npm.** `npx agent-checkout` works on this machine through the global `npm link`; a visitor's agent would hit a 404 until the package is published (harness-sdk CI, on your say-so). harness-sdk has two new commits on `main` (statewire pings, checkout v2); I did not push.
8. **Bundled in this branch beyond the docs app:** `packages/tap` no-op dispatch bail fix plus its test and changeset (the checkout UI hit an infinite re-render without it), `packages/ui` select items lay out icon + label, and the `d` theme hotkey stops toggling on other keys with a `d` lowercase form. Each is its own commit so you can cherry-pick or drop them.
9. **Claude-in-Chrome could not screenshot this session** (CDP capture failed), so the browser pass was done by reading page text and driving the buttons: connect, custom answer with note, plan review, request changes, revised plan, approve, install steps, optional question skipped, Installed, Finish. All rendered and updated live.

## Earlier rounds

10. **Package layout in harness-sdk.** One package `packages/checkout/core` published as `agent-checkout` (private until you ask for a release): protocol types + host (`agent-checkout/host`, used by the worker) + the CLI bin. The worker lives in `apps/checkout-worker`.
11. **Docs site carries a copy of the protocol types and presets** (`apps/docs/lib/checkout/protocol.ts`, `presets.ts`, byte-equal with harness-sdk `packages/checkout/core/src/`) and depends on `statewire` from npm (0.19.1). When you publish `agent-checkout`, the docs import the types from the package instead.
12. **Session secret is the id.** The browser mints a 12-character alphanumeric id; the worker maps `/<id>` onto the `CHECKOUT` binding.
13. **Agent presence is a heartbeat.** Only `agent-checkout <url> stream` marks the agent connected; one-shot commands do not count, so an agent that skips the Monitor shows as "gone quiet".
14. **Cart is frozen during checkout.** The only way out is "End session" with the confirm dialog.
15. **The default product is `assistant-ui`** (slug renamed from `ai-sdk`). Brand marks come from `components/icons/*` where a React icon exists and from `public/icons/*.svg` otherwise.
16. **URLs moved from `/catalog` to `/shop`** with no redirects. The route group folder is still `app/(catalog)` and the component/lib folders keep the `catalog` name.
17. **Agent icon comes from the shipping method** picked on the cart page until the CLI reports a kind. Claude and Gemini have icons; Codex, Cursor and "other" fall back to a generic bot icon.
