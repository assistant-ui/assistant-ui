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
directly. Install this standalone harness with `npm ci` from `evals/`; it is
not included in the root pnpm workspace.

```bash
cd evals
pnpm eval                                   # all cases, all candidates, 3 trials
TRIALS=5 node src/cli.ts                     # more trials = tighter signal
node src/cli.ts pr-review-comments           # one case
CANDIDATES=baseline,describe-now node src/cli.ts   # subset of candidates
AGENT_MODEL=claude-haiku-4-5 node src/cli.ts # pin the agent model
```

Results are printed and written to `results/latest.md` and
`.evals_output/live/latest.json` (`eval-report/v1`).

## Adding a case

Drop a file in `src/cases/` exporting an `EvalCase` and register it in
`src/cases/index.ts`. A good case has a `task` that tempts the mistake and a
`rubric` the judge can apply mechanically. Confirm `baseline` fails before
trusting any candidate that passes.

The five registered cases cover editing a stale review comment, a bug fix,
fresh utility code, editing registry kit code at its source of truth, and
packaging an optional host-owned SDK correctly. Specialized guidance is scoped
to its relevant cases. Treat a newly added case as provisional until a live
baseline run reproduces the targeted mistake.

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

## Eval dashboard

```bash
npm run dashboard:lint
npm run dashboard
npm run dashboard:serve
```

Open `http://127.0.0.1:4318/eval-dashboard/` for the generated static report.
The Markdown matrix remains available for terminal use. To expose the same
report in the docs app, run `npm run dashboard:docs`, then start the docs app
normally and visit `/eval-dashboard/`. Generated reports are ignored by Git;
they are not published automatically.

Each scored trial becomes a row with stable case/candidate/trial identity,
judge reasoning, artifact evidence, and hashes of the dataset, rubric and
candidate prompt. Baseline rows expect a behavioral failure; candidate rows
expect a pass. Execution errors and candidates with no trials always produce
unmet expectations, including for the baseline.

Suites are report-only because the A/B harness includes competing guidance
candidates. `npm run dashboard:check` explicitly gates on 100% matched
expectations and disables the raw pass-rate threshold so expected baseline
failures are not regressions. Run it on the selected candidates appropriate
for your policy. The harness does not record tool-call trajectories or token
usage, and the report makes no claim that it does.

Offline verification, without invoking Claude or a judge:

```bash
npm test
npm run typecheck
npm run dashboard:smoke
```

The smoke run generates a clearly labelled synthetic report, verifies import,
lint/report output and expected pass/fail gate exits, and checks HTML escaping.
It does not measure model quality or replace a live eval run.
