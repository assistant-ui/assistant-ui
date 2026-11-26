# agent-docs

Can a coding agent build what developers ask for, using only our AI docs?

Most people now build with a coding agent, so the docs' real reader is often an agent. This suite gives a fresh agent an empty folder, a task a developer would ask for, and a saved copy of the docs the site serves to agents (`llms.txt` and the markdown of every page it links). When the agent is done, a check builds the app, typechecks it and drives it in headless Chrome against a scripted mock model. A task passes only when the feature works.

The failures are the point. Each trial keeps the agent's transcript, which docs pages it read, how often it had to dig through `node_modules` for an answer the docs didn't give, and its own closing list of what was missing, wrong or hard to find in the docs.

## Tasks

| Task | The developer asks for |
| --- | --- |
| `chat-basic` | A streaming chat page backed by an OpenAI-compatible model |
| `thread-history` | A thread list whose threads and messages survive a reload, stored by the app |
| `tool-approval` | A backend tool that waits for the user's approval before it runs |
| `tool-ui` | A tool call rendered as a custom card instead of raw JSON |
| `custom-backend` | assistant-ui on top of an existing streaming backend that isn't the AI SDK |
| `suggestions` | Starter suggestions on the empty chat that send on click |
| `attachments` | Image attachments in the composer that reach the model |
| `model-picker` | A model picker whose choice reaches the backend |
| `frontend-context` | Page state passed to the model as system instructions |
| `error-retry` | A failed reply shows an error in the thread with a Retry button |

They follow what people ask the docs assistant and search the docs for most, written in our own words. Each task's check is in [`tasks.ts`](tasks.ts); the mock model's scripted replies are described at the top of [`mock-llm.ts`](mock-llm.ts).

## Running

It needs the `claude` CLI signed in, Chrome (or `CHROME_PATH`), and macOS, where it has been run; Linux, where Claude Code's sandbox needs `bubblewrap` and `socat`, has the matching paths set but hasn't been run yet. A trial takes 4 to 10 minutes with Sonnet; each one installs packages and builds a Next.js app, so run at most two at a time on a laptop.

```bash
cd evals
TRIALS=1 pnpm eval agent-docs                  # every task against the live site's AI docs
TRIALS=1 pnpm eval agent-docs tool-approval    # one task
node src/suites/agent-docs/score.ts            # the score table across all saved trials
```

To measure docs that aren't deployed yet, serve `apps/docs` locally and point the suite at it with a label of your own:

```bash
DOCS_URL=http://localhost:3000 DOCS_LABEL=my-branch TRIALS=1 pnpm eval agent-docs
node src/suites/agent-docs/score.ts live my-branch
```

`DOCS_MODE` compares where the docs live while keeping everything else the same; see the table below.

To run a check again on an app an agent already built (after fixing a check, say): `node src/suites/agent-docs/recheck.ts <run-dir> <task>`.

| Variable | Default | |
| --- | --- | --- |
| `DOCS_URL` | `https://www.assistant-ui.com` | Where to read `llms.txt` and the pages from |
| `DOCS_LABEL` | `live` | The name trials are scored under |
| `DOCS_MODE` | `local` | Where the agent finds the docs: `local` (a folder beside the project), `web` (the live site, with WebFetch) or `bundled` (inside the project, with an AGENTS.md index of about 7 KB) |
| `AGENT_MODEL` | `sonnet` | The agent's model |
| `AGENT_TIMEOUT_MIN` | `30` | When to stop an agent |
| `AGENT_CONCURRENCY` | `1` | Trials of one task run at once |
| `AGENT_DOCS_RUNS_DIR` | `$TMPDIR/aui-agent-docs` | Where the docs snapshot and each trial's folder go |
| `AGENT_DOCS_PRIVATE_DIRS` | | More folders the agent may neither read nor write, comma-separated |

## What the agent can and can't do

The agent runs as `claude -p` with Bash, Read, Write, Edit, Glob and Grep, in the trial's empty folder, with the docs folder added. Its shell runs in Claude Code's sandbox, which is the boundary, so permissions are bypassed and nothing waits on a prompt: it can read nothing in the home directory except the preference files `create-next-app` and `shadcn` keep, nor this repository; it writes only inside the trial folder; and its network reaches only package installs (npm, the assistant-ui and shadcn registries, GitHub downloads) and localhost. It gets a bare environment and a `PATH` with only `node`, `npm`, `npx` and `pnpm`. Every process it starts is killed 30 seconds after it answers. The app it built is then built and served with the same `PATH` and no secrets.

## Output

Each trial writes `results/agent-docs/trials/<task>--<label>--<time>.json`: pass or the first step that failed, the agent's minutes and turns, the docs pages it read, its `node_modules` lookups, and its closing note about the docs. The trial folder under `AGENT_DOCS_RUNS_DIR` keeps the app, `transcript.jsonl`, the mock model's request logs and `check.log`.
