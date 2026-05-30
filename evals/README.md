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
