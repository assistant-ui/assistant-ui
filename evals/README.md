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

First run on the `pr-review-comments` case (agent: Haiku 4.5, n=8). The case
seeds a config field that already carries a change-narration comment
(`// bumped from 5000 to 8000 …`) and asks the agent to bump the value again.
An undirected agent reliably keeps narrating the history instead of deleting a
comment that only ever described a past change.

| candidate | guidance injected | pass |
| --- | --- | ---: |
| baseline | _(none)_ | 0–13% |
| describe-now | "Comments describe the code as it is, not how it changed." | 0% |
| why-not-what | "Comments explain why the code is the way it is; they never narrate what changed." | 13% |
| no-history | "Never write comments that reference the PR, the review, or a previous version of the code." | 25% |
| delete-stale | "When you change code, delete any comment that only records its history." | 50% |
| drop-tombstones | "Code comments describe the current code, never its history. When you edit a line, remove any nearby comment that just narrates a past change." | **75%** |

Two things fell out of this:

1. **Telling the model how to _write_ comments doesn't make it _remove_ a stale
   one.** The three "write good comments" phrasings (`describe-now`,
   `why-not-what`, `no-history`) sit in the noise around baseline. The agent
   reads them as advice for new comments, not a mandate to clean up the
   existing one.
2. **Only guidance that explicitly says to delete history comments moves the
   needle**, and directive phrasing beats terse — `drop-tombstones` (two
   sentences) reaches 75% where the one-liner `delete-stale` gets to 50%.

So the elegant-vs-effective tradeoff is measurable, not a matter of taste. Note
the modern-model caveat: the same agents almost never _add_ a fresh
change-narration comment unprompted (earlier, weaker cases passed ~100% at
baseline) — the habit only shows up under mimicry, when stale history comments
are already present to copy.

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
