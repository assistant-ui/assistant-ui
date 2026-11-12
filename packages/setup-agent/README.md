# setup-agent

One setup, shared live between the browser that opened it and the coding agent installing its products. The state is a Statewire host (`setup-agent/host`) served from a Cloudflare Durable Object (`apps/checkout-worker`); the CLI (`npx setup-agent <url>`) is a thin Statewire client the agent drives from its shell.

```sh
npx setup-agent <url>              # instructions plus the current setup
npx setup-agent <url> stream       # one JSON array of events per line; run it under a Monitor
npx setup-agent <url> wait start   # wait for the user to click Begin plan in their browser
npx setup-agent <url> log "Sure, I will keep the existing chat route"   # a reply, or something no question or step conveys
npx setup-agent <url> ask --preset llm-provider --only openai,anthropic --default openai
npx setup-agent <url> ask "Where should assistant-ui live?" --optional   # keep working; the answer arrives on the stream
npx setup-agent <url> ask "Which integrations?" --choices slack,email --icons "slack=message,email=mail"   # multi-select; answers ["slack","email"]
npx setup-agent <url> ask "Which package manager?" --choices pnpm,npm --icons "pnpm=package,npm=package" --single   # the options exclude each other; answers "pnpm"
npx setup-agent <url> wait q1      # block only when nothing else can proceed
npx setup-agent <url> plan --file plan.md --wait   # {"decision":"approve"} or {"decision":"revise","feedback":"..."}
npx setup-agent <url> add-step "Install the packages" --detail "pnpm add ..." --active   # prints {"stepId":"s1"}
npx setup-agent <url> step s1 done --note "installed"
npx setup-agent <url> env q2 OPENAI_API_KEY --file .env.local   # write the key behind a model answer without seeing it
npx setup-agent <url> done --summary "installed the thread and a chat route" --preview http://localhost:3000
npx setup-agent <url> answer q3 pnpm   # the user answered in the agent's own chat; also: answer plan approve, answer finish close
npx setup-agent <url> stream --setup-app-url https://setup.assistant-ui.com   # also open the setup page when the setup waits on the user
```

## Phases

A setup opens `waiting` with its products and nothing else: no steps, no questions. After connecting, the agent tells the user to return to their browser and click **Begin plan**. It keeps the stream running and blocks on `wait start`, which prints `{"ok":true,"status":"planning"}` once planning begins, or `{"ok":false,"status":"cancelled"}` when the user ends the setup first. The browser sends `checkout/begin-plan`, moving the setup to `planning` and emitting `planning.started` on the stream. Questions and plan submissions are refused while waiting. Products are the starting list of names and setup guide references. The agent explores every starting guide and may discover other relevant products or dependencies without adding them to the cart. It includes those additions in the plan for approval. The legacy `ask --product` and `checkout/add-product` protocol remains supported for older agents. In `planning`, the agent investigates the project, asks what the code does not decide, and proposes a markdown plan with `plan` carrying its findings. `log` is for replying to the user and for what no question or step conveys. The user approves the plan or asks for changes with feedback; every revision is kept. Approval moves the setup to `installing`, where the agent declares its own steps with `add-step` and works through them with `step`. `add-step` and `step` are refused before approval. `done` marks the remaining steps done and proposes closing, with an optional `--summary` and an optional `--preview <url>` naming a dev server the agent left running; a preview must be an http(s) URL on localhost, and the browser offers to open it. `done` does not close. The browser shows the proposal with a close action that sends `checkout/finish`, and the stream prints `finished`. Until then the agent stays idle on the stream, because the user may send a follow-up message; after handling one it runs `done` again to renew the proposal.

The URL is the browser's link to its agent, not one setup. A finished or cancelled setup stays on the link, and the browser's next setup replaces it with a new `checkout/create` carrying a new `id`: the plans, steps, inputs and log start over, the agent's presence carries across when it is still connected, and the stream prints `setup.created` with the new products. The agent keeps the stream running after `finished` or `cancelled` and blocks on `wait start`, which returns once the next setup begins planning; a setup already closed when the wait begins is skipped rather than reported.

The browser sends the setup `id` and the displayed plan `revision` with each `checkout/plan` decision. The host rejects a mismatched setup or revision with `stale-plan`, so a queued decision cannot approve or revise a newer plan. Older clients may omit these fields and retain their existing behavior. The guard requires a host running this version of `setup-agent`.

## Inputs

Inputs include `text`, `choice`, `model` and `entry-point`, plus the legacy `product` kind. A choice carries `options` (`id`, `label`, `description`, `icon`, `variants`), an optional `default` and a `help` note the browser renders as a "help me choose" disclosure. Option ids are unique, and neither option nor variant ids may contain `:`. The answer is the option id, `<option>:<variant>` when the option has variants (`langgraph:python`), or the user's own text when none of the options fit (including any text with more than one `:`); the stream marks that answer `custom`. An agent's own choice is multi-select unless asked with `--single`: the user checks any number of options (none may have variants), and the answer is a JSON array of those entries, which `wait` and the stream print as an array and `status` holds as text. `--single` is for options that exclude each other (one framework, one model, yes or no) and answers one id. Every one of the agent's own options must carry an `icon` from the pack `OPTION_ICONS` exports (`--icons "slack=message,email=mail"`); the CLI refuses the question otherwise. A preset option carries a brand mark instead. Every answer may carry a `note` from the user. A model input lists providers as its options; the browser collects the provider, its API key, the model and an optional reasoning effort, and the answer is that object as JSON (`{"provider","model","reasoningEffort"?}`); the API key is deposited separately and only ever reaches the env file the agent names through `env`. Only the CLI that asked can take it: `ask` keeps a redeem key in a private file under the user's state directory, or a per-user directory under the temp directory, and refuses a model question when neither can hold it, so `env` runs as the same user on the same machine.

When the setup puts an assistant in the app, the agent asks for its entry point after discovering the app, with `ask "<prompt>" --entry-points '<JSON array>' [--default <id>]`. Each of 1–3 options includes a stable `id`, `label`, contextual `description`, and `entryPoint: { formFactor: "modal" | "sidebar" | "full-page", placement, trigger, recommended? }`. At most one option is recommended, and the agent marks it with `recommended` rather than `--default`, which would preselect it. Two alternatives can share a form factor when their placements differ. Entry-point questions accept exactly one option id, with an optional user note; variants, custom ids, a help note and multi-selection are refused. The agent describes the actual app's workflow, placement and opening action, then incorporates the user's selection into the approved plan.

Two standard choices and a legacy project choice ship as presets (`setup-agent` exports `INPUT_PRESETS` and `presetInput`), so the browser and the CLI agree on their options and brand marks:

- `framework`: Vercel AI SDK, Mastra, LangGraph, each with its language.
- `llm-provider`: OpenAI, Anthropic, Google Gemini, OpenRouter, xAI, Mistral, DeepSeek, Groq, Fireworks AI; defaults to OpenAI. Rendered as the model picker (provider, key, model, reasoning effort).
- `project` (legacy decoder compatibility): the React projects the agent found, passed as `--choices "apps/web=Next.js,apps/admin"`, ahead of a fixed "New project" option whose second pick is the meta framework. Answers a path, or `new:<next|vite|react-router|tanstack-start|expo>`.

`--only` restricts a preset to some of its options and leaves out `--choices` (a single id locks the choice in) and `--default` preselects one.

## SDK

`setup-agent/sdk` is what a CLI embeds to offer `<tool> setup` to coding agents; `npx assistant-ui@latest setup` is built on it. The `setup-agent` bin is a thin wrapper around the same code.

```ts
import { runAgentSetup } from "setup-agent/sdk";

const { stream, client } = await runAgentSetup({
  server: "https://checkout.assistant-ui.com",
  setupAppUrl: "https://setup.assistant-ui.com",
  products: [{ slug: "assistant-ui", name: "assistant-ui" }],
  command: "npx my-tool setup", // how the agent runs `<command> <url> <step>`
  name: "my-tool setup",
});
process.on("SIGINT", () => stream.stop().finally(() => client.dispose()));
```

`runAgentSetup` starts a session, prints the briefing and keeps running as the stream. Route `<tool> setup <url> ...` to `runSetupCommand(argv, { command, browser: { setupAppUrl } })` from `setup-agent/cli` for the other steps.

The browser opens only when the setup waits on the user (an open input, a proposed plan, a proposal to close). The joined page sends `browser/heartbeat` every 5s and `browser/bye` on pagehide; it counts as present for 20s after a beat. Setup:

- opens the page for the first need, one tab for everything waiting;
- opens nothing while a joined page is present;
- never opens a second tab within 30s of the last, and never reopens a tab that has not joined; it prints `input.needed` (`reason: "recently-opened"`) so the agent can ask in its own chat;
- prints `input.needed` (`reason: "browser-closed"`) when the page leaves with something waiting, or a need arrives inside the 30s after it left; the next need after that reopens it;
- under `--no-open`, prints `input.needed` (`reason: "no-browser"`) for every need.

Each `input.needed` carries the question, its options and the `answer` command. On a worker without browser presence, setup opens once and then leaves the rest to the agent.

## Workspace

The package lives in `packages/setup-agent`; its Cloudflare worker lives in `apps/checkout-worker`. Build the worker dependencies with `pnpm turbo build --filter="checkout-worker^..."`, then run `pnpm --filter checkout-worker dev`. The worker consumes the published `@statewire/cloudflare` adapter.
