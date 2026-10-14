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

Results are printed and written to `results/<suite>/latest.md`. `pnpm test` checks the runner and the reports without calling a model.

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
