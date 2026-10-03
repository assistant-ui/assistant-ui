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
```

## Phases

A setup opens `waiting` with its products and nothing else: no steps, no questions. After connecting, the agent tells the user to return to their browser and click **Begin plan**. It keeps the stream running and blocks on `wait start`. The browser sends `checkout/begin-plan`, moving the setup to `planning` and emitting `planning.started` on the stream. Questions and plan submissions are refused while waiting. When a product needs another one the project lacks, the agent proposes it with `ask "<why>" --product <slug>`; the browser, which owns the catalog, accepts with `checkout/add-product` (the product and its guide join `products`, the input answers `added`) or dismisses the input. In `planning`, the agent investigates the project, asks what the code does not decide, and proposes a markdown plan with `plan` carrying its findings. `log` is for replying to the user and for what no question or step conveys. The user approves the plan or asks for changes with feedback; every revision is kept. Approval moves the setup to `installing`, where the agent declares its own steps with `add-step` and works through them with `step`. `add-step` and `step` are refused before approval. `done` marks the remaining steps done and proposes closing, with an optional `--summary` and an optional `--preview <url>` naming a dev server the agent left running; a preview must be an http(s) URL on localhost, and the browser offers to open it. `done` does not close. The browser shows the proposal with a close action that sends `checkout/finish`, and the stream prints `finished`. Until then the agent stays idle on the stream, because the user may send a follow-up message; after handling one it runs `done` again to renew the proposal.

The URL is the browser's link to its agent, not one setup. A finished or cancelled setup stays on the link, and the browser's next setup replaces it with a new `checkout/create` carrying a new `id`: the plans, steps, inputs and log start over, the agent's presence carries across when it is still connected, and the stream prints `setup.created` with the new products. The agent keeps the stream running after `finished` or `cancelled` and blocks on `wait start`, which returns once the next setup begins planning; a setup already closed when the wait begins is skipped rather than reported.

## Inputs

Every input is `text`, `choice` or `model`. A choice carries `options` (`id`, `label`, `description`, `icon`, `variants`), an optional `default` and a `help` note the browser renders as a "help me choose" disclosure. The answer is the option id, `<option>:<variant>` when the option has variants (`langgraph:python`), or the user's own text when none of the options fit; the stream marks that answer `custom`. An agent's own choice is multi-select unless asked with `--single`: the user checks any number of options (none may have variants), and the answer is a JSON array of those entries, which `wait` and the stream print as an array and `status` holds as text. `--single` is for options that exclude each other (one framework, one model, yes or no) and answers one id. Every one of the agent's own options must carry an `icon` from the pack `OPTION_ICONS` exports (`--icons "slack=message,email=mail"`); the CLI refuses the question otherwise. A preset option carries a brand mark instead. Every answer may carry a `note` from the user. A model input lists providers as its options; the browser collects the provider, its API key, the model and an optional reasoning effort, and the answer is that object as JSON (`{"provider","model","reasoningEffort"?}`); the API key is deposited separately and only ever reaches the env file the agent names through `env`.

Three standard choices ship as presets (`setup-agent` exports `INPUT_PRESETS` and `presetInput`), so the browser and the CLI agree on their options and brand marks:

- `framework`: Vercel AI SDK, Mastra, LangGraph, each with its language.
- `llm-provider`: OpenAI, Anthropic, Google Gemini, OpenRouter, xAI, Mistral, DeepSeek, Groq, Fireworks AI; defaults to OpenAI. Rendered as the model picker (provider, key, model, reasoning effort).
- `project`: the React projects the agent found, passed as `--choices "apps/web=Next.js,apps/admin"`, ahead of a fixed "New project" option whose second pick is the meta framework. Answers a path, or `new:<next|vite|react-router|tanstack-start|expo>`.

`--only` restricts a preset to some of its options (a single id locks the choice in) and `--default` preselects one.

## Workspace

The package lives in `packages/setup-agent`; its Cloudflare worker lives in `apps/checkout-worker`. Build the worker dependencies with `pnpm turbo build --filter="checkout-worker^..."`, then run `pnpm --filter checkout-worker dev`. The worker consumes the published `@statewire/cloudflare` adapter.
