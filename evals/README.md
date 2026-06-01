# Prompt evals

A tiny A/B harness for one question: **does this guidance sentence actually
change behavior?** `AGENTS.md` is loaded into every agent, so every line there
has a cost. A sentence earns its place only if it measurably fixes a mistake an
undirected agent makes — otherwise it's noise.

## How it works

Each **case** seeds an isolated sandbox with files, hands the agent a realistic
task (e.g. "apply this PR-review feedback"), and judges the result against a
rubric. We run every **candidate** guidance string — including an empty
`baseline` — and compare pass rates:

- `baseline` should **reproduce the mistake** (low pass rate). If it doesn't,
  the case isn't testing anything.
- A candidate **earns its place** if it lifts the pass rate to ~100%.
- Among candidates that work, the **shortest** wins. That's the line we add.

The agent runs via the `claude` CLI in a throwaway `/tmp` sandbox (so it sees no
`AGENTS.md` except the guidance we inject through `--append-system-prompt`). A
fresh `claude` instance acts as the LLM judge.

## Findings: comment hygiene

The `pr-review-comments` case seeds a config field that already carries a
change-narration comment (`// bumped from 5000 to 8000 …`) and asks the agent to
bump the value again. An undirected agent reliably keeps narrating the history
instead of deleting a comment that only ever described a past change.

Pass rate by guidance, on both a small and a frontier agent model (judge:
Sonnet 4.6):

| candidate | guidance injected | Haiku 4.5 | Opus 4.8 |
| --- | --- | ---: | ---: |
| baseline | _(none)_ | 0–13% | 0% |
| describe-now | "Comments describe the code as it is, not how it changed." | 0% | 0% |
| why-not-what | "Comments explain why the code is the way it is; they never narrate what changed." | 13% | — |
| no-history | "Never write comments that reference the PR, the review, or a previous version of the code." | 25% | — |
| drop-tombstones | "Code comments describe the current code, never its history. When you edit a line, remove any nearby comment that just narrates a past change." | 75% | 67% |
| **delete-stale** | **"When you change code, delete any comment that only records its history."** | 50% | **~94%** |

(Haiku at n=8; Opus `baseline`/`delete-stale` confirmed at n=6 then n=10 →
0/16 and 15/16.)

Three things fell out of this:

1. **Telling the model how to _write_ comments doesn't make it _remove_ a stale
   one.** The "write good comments" phrasings (`describe-now`, `why-not-what`,
   `no-history`) sit in the noise around baseline on both models — the agent
   reads them as advice for new comments, not a mandate to clean up the
   existing one. Only guidance that explicitly says to _delete_ history comments
   moves the needle.
2. **The best phrasing is model-dependent.** The terse one-liner `delete-stale`
   is near-perfect on Opus (~94%) but only halfway on Haiku; the wordier
   `drop-tombstones` is the reverse (75% Haiku, 67% Opus). Extra words help a
   small model and distract a frontier one. We optimize for the model our agents
   actually run on (Opus), so the one-liner wins — and it's the shorter line.
3. **The _add_ habit barely reproduces on modern models.** Earlier, weaker cases
   (write fresh code; apply a clean rename) passed ~100% at baseline — the agents
   almost never _add_ a change-narration comment unprompted. The habit only
   surfaces under mimicry, when stale history comments already exist to copy.

`delete-stale` earned its line in the root `AGENTS.md`; the other phrasings did
not.

## Running

Requires the `claude` CLI on PATH, authenticated. Node 22+ runs the TypeScript
directly — no install step.

```bash
cd evals
pnpm eval                                   # all cases, all candidates, 3 trials
TRIALS=5 node src/cli.ts                     # more trials = tighter signal
node src/cli.ts pr-review-comments           # one case
CANDIDATES=baseline,describe-now node src/cli.ts   # subset of candidates
AGENT_MODEL=claude-haiku-4-5 node src/cli.ts # pin the agent model
```

Results are printed and written to `results/latest.md`.

## Adding a case

Drop a file in `src/cases/` exporting an `EvalCase` and register it in
`src/cases/index.ts`. A good case has a `task` that tempts the mistake and a
`rubric` the judge can apply mechanically. Confirm `baseline` fails before
trusting any candidate that passes.

## Layout

```
src/
  types.ts        EvalCase / Candidate / Verdict
  agent.ts        runs the agent in a sandbox, with/without guidance
  judge.ts        scores an artifact against a rubric (LLM judge)
  runner.ts       baseline-vs-candidates A/B for one case
  candidates.ts   the guidance phrasings under test
  cases/          the scenarios
  cli.ts          entry point
```
