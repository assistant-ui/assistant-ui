# Evals

A/B evals for prompts and model output. A suite runs each of its candidates against each of its cases several times, has a judge score every trial, and reports how the candidates compare. A trial that fails to run (a CLI timeout, a non-zero exit) is recorded as an error and left out of the scores.

## Suites

| Suite | Question |
| --- | --- |
| [`comment-hygiene`](src/suites/comment-hygiene/README.md) | Which guidance sentence about code comments earns a line in `AGENTS.md`? |
| [`generative-ui`](src/suites/generative-ui/README.md) | Which answer format (Markdown, `present`, spec, or frame) do models write best? |

## Running

Node runs the TypeScript directly, and `pnpm eval` loads `evals/.env` when it exists. A suite's README lists what else it needs, such as a CLI on `PATH`, an API key, or built workspace packages.

```bash
cd evals
pnpm eval <suite>                                   # all cases and candidates, 3 trials each
pnpm eval <suite> <case>                            # one case
TRIALS=5 pnpm eval <suite>                          # more trials, tighter signal
CANDIDATES=baseline,delete-stale pnpm eval <suite>  # a subset of candidates
DUMP=1 pnpm eval <suite> <case>                     # print every trial's verdict and artifact
```

Results are printed and written to `results/<suite>/latest.md`. The `comment-hygiene` suite also writes `.evals_output/live/latest.json` (`eval-report/v1`) for the dashboard. `pnpm test` checks the runner and reports without calling a model.

## Adding a suite

Create `src/suites/<suite>/index.ts` exporting a `Suite` (see `src/types.ts`), add a loader for it to `src/suites/index.ts`, and give it a README. The suite owns its cases, its candidates, how one trial runs and is judged, and its report; the runner owns repetition, error capture, and progress output.

## Layout

```
src/
  cli.ts        entry point: pnpm eval <suite> [case]
  runner.ts     runs a suite's candidates against one case
  types.ts      Suite and the trial and result shapes it shares with the runner
  suites/       one directory per suite
```


## Eval dashboard

The dashboard commands consume the latest `comment-hygiene` model evidence:

```bash
pnpm dashboard:lint
pnpm dashboard
pnpm dashboard:serve
```

Open `http://127.0.0.1:4318/eval-dashboard/` for the generated static report. To expose the same report in the docs app, run `pnpm dashboard:docs`, start the docs app normally, and visit `/eval-dashboard/`. Generated reports are ignored by Git and are not published automatically.

Each scored trial becomes a row with stable case/candidate/trial identity, judge reasoning, artifact evidence, and hashes of the dataset, rubric, and candidate prompt. Baseline rows expect a behavioral failure; candidate rows expect a pass. Execution errors and candidates with no trials always produce unmet expectations, including for the baseline.

The `comment-hygiene` suite is report-only because it includes competing guidance candidates. `pnpm dashboard:check` gates on 100% matched expectations and disables the raw pass-rate threshold so expected baseline failures are not regressions. Run it on the selected candidates appropriate for your policy. The harness does not record tool-call trajectories or token usage, and the report makes no claim that it does.

Offline verification, without invoking Claude or a judge:

```bash
pnpm test
pnpm typecheck
pnpm dashboard:smoke
```

The smoke run generates a clearly labelled synthetic report, verifies import, lint/report output and expected pass/fail gate exits, and checks HTML escaping. It proves plumbing only and does not measure model quality.
