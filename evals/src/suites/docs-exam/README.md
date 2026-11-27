# docs-exam

Can a developer who skims the human docs answer what developers actually ask? This suite is the score for the human docs: a fresh reader that may open only the docs pages answers held-out questions, and an LLM judge grades each answer against a reference written from the source code.

The concept exam in `apps/docs/evals/concept-exam` drove the concept fixes in assistant-ui#10891 and now scores 38/38 (deep) and 37/38 (skim) on the very questions whose misses drove those fixes, so it can't show further progress. This suite keeps those 38 as the `concept` case and adds a held-out `heldout` case that no docs change has been tuned against.

## The questions

`questions.json` holds 100 questions. Their topics and counts follow what readers asked the docs assistant over 30 days (1,413 turns with a usable topic, Oct 27 to Nov 26 2026), about one question per 14 turns with at least one per topic: 22 on setup, the CLI and picking a runtime, 10 on ready-made elements, 9 on styling, 9 on tool UIs, 5 each on LocalRuntime backends, driving the thread from code, agent frameworks, persistence and the thread list, and 1 to 3 on each of 15 smaller topics. The wording is ours, not readers'. None repeats a concept-exam question.

Each question has a reference answer, the key points a correct answer must cover, and the code it was read from: a file, a line and an anchor string on that line. When the anchor disappears from the file, the run lists the question under "References that may be stale" so someone can re-check it; the line number is where it was read and may drift.

## The reader

The reader is `claude -p` (Sonnet by default) in a folder that holds only the docs as Markdown, with `--restricted` (file tools confined to that folder), `--safe-mode` and `--strict-mcp-config`, and is told not to use what it already knows. The docs come from `apps/docs/content/docs` through the concept exam's `extract.mjs`, plus the Elements catalog (`content/elements`, `/elements` on the site) under `elements/`, because that catalog is where the site answers "is there a ready-made X". The reader prompts are the concept exam's:

- **skim** (the score): opens at most three pages picked from `INDEX.md` and can't search, like a developer skimming before briefing a coding agent. A run that opens more is flagged `overBudget`.
- **deep**: reads and searches as much as it likes.

## The judge

`judge.md` grades each answer correct, partly or wrong against the key points, and reports whether the reader said the docs don't say something (`docsSilent`) and every sentence where it said the docs contradict themselves (`conflicts`). It runs as `claude -p` with no tools.

It was checked against the hand grades of the concept exam's eight recorded runs (304 answers): tuned on the four `results/first-pass` runs, then checked once on the four re-recorded `results/` runs.

| Judge prompt | Answers | Same grade as the hand grade | Correct vs not: same | Cohen's kappa |
| --- | --- | --- | --- | --- |
| First draft, first-pass before runs | 76 | 84% | 84% | 0.53 |
| Second draft, re-recorded runs | 152 | 86% | 86% | 0.44 |
| Final, first-pass runs (tuning set) | 152 | 93% | 93% | 0.63 |
| Final, re-recorded runs (check set) | 152 | 90% | 90% | 0.52 |

The hand grades are 89% correct, so kappa is the stricter number. 22 of the 25 final disagreements fall on 8 of the 38 questions, where a key point is loose enough for either grade (for example, whether an answer that hedges on Python but names the data stream runtime covers "a Python service can emit the data stream"). One is a hand-grade slip: the recorded answer (before-deep q16) only says the reader is still checking, and it was graded correct. `validate-judge.ts` reruns the check.

## Running

It needs Claude Code 2.1.259 or later (for `--permission-prompts none`; the runs here used 2.1.332), signed in or with `ANTHROPIC_API_KEY`. No workspace install is needed: the suite uses only Node built-ins. `pnpm eval` loads `evals/.env`; the direct `node` commands below take `--env-file-if-exists=.env` for the same.

```bash
cd evals
TRIALS=1 CANDIDATES=skim pnpm eval docs-exam heldout   # the score: held-out questions, skim reader
TRIALS=1 pnpm eval docs-exam                           # both cases, both readers
node --env-file-if-exists=.env src/suites/docs-exam/run-exam.ts --exam heldout --reader skim --out /tmp/run.json   # add --only h001,h002 for some
node --env-file-if-exists=.env src/suites/docs-exam/run-exam.ts --regrade /tmp/run.json --out /tmp/regraded.json   # judge saved answers again
node --env-file-if-exists=.env src/suites/docs-exam/validate-judge.ts --set test   # judge vs hand grades
```

| Variable | Default | |
| --- | --- | --- |
| `READER_MODEL` | `sonnet` | The reader's model |
| `JUDGE_MODEL` | `sonnet` | The judge's model |
| `EXAM_CONCURRENCY` | `4` | Questions in flight at once |
| `READER_TIMEOUT_S` | `480` | When to stop one reader |
| `DOCS_CONTENT_DIR` | this checkout's `apps/docs/content/docs` | Grade another checkout's docs, e.g. a branch's, for a before and after |
| `DOCS_ELEMENTS` | on | `0` leaves the Elements catalog out, as the concept exam does |
| `DOCS_TEXT_DIR` | | A folder extracted earlier, used as is |

A held-out skim run takes about 10 minutes at 4 at a time and, as Claude Code reports it, about $18 (readers $17.80, judge $0.70). Each trial writes `results/docs-exam/runs/<case>--<reader>--<time>.json` (every answer, the pages read and the verdict) and a `.gaps.md` beside it.

## Findings for cards

The `.gaps.md` file is the to-do list for a person: first every sentence where the reader said the docs conflict, then every answer that missed a key point, with what it missed, whether the reader said the docs don't say, and the pages it read. Nothing files cards automatically.

## CI

A workflow that runs one exam on demand (`workflow_dispatch`), puts the findings in the job summary and uploads the answers is in its own PR, assistant-ui#10916, since workflow permissions need an owner's decision. It has no schedule: a weekly run would add about $75 a month of model spend, and today the only model spend in CI is claude-review. It uses the same short-lived assistant-billing key as claude-review; add the commented `schedule` once that spend is approved.

## Baseline

`baseline/` holds the findings files of the first runs, on main at a690f33d4 (Nov 26 2026), skim reader, Sonnet reader and judge. The full answers aren't committed (they would be most of this PR's lines); `run-exam.ts` writes them again.

| Run | Correct | Partly | Wrong | Said "the docs don't say" | Conflict sentences | Pages per question |
| --- | --- | --- | --- | --- | --- | --- |
| **Held-out, docs + Elements (the score)** | **76/100** | 20 | 4 | 73 | 2 | 2.0 |
| Held-out, docs only | 67/100 | 24 | 9 | 73 | 3 | 2.1 |
| Concept exam's 38, docs only, same judge | 34/38 (89%) | 4 | 0 | 16 | 0 | 2.3 |

- **The held-out exam has room to climb; the concept exam doesn't.** The same reader and judge score 89% on the 38 questions the concept fixes were tuned on and 76% on questions no fix has seen. (The concept exam's hand grades gave the same reader 37/38; the judge is a little stricter.)
- **Run-to-run noise is a few points.** Between the two held-out runs, 11 of 100 grades changed; on the 90 questions the Elements catalog doesn't touch, 65 and 69 were correct. Compare changes larger than that, or run twice.
- **"Wrong" is mostly "found nothing".** All 4 wrong answers (all 9 without Elements) say the docs don't say; none states a wrong API. A skimmer who misses gets silence, not misinformation.
- **Where it misses.** By topic, with Elements: AI SDK runtime options 0/2 (extra request fields, how resumable streams are keyed), ExternalStoreRuntime `setMessages` 0/1, and 1 of 2 for attachments, markdown smoothing, LangGraph interrupts, the assistant-stream controller and the message queue. In each, the answer is in the code (often a typing or a doc comment) but not on a page the skimmer opened. The findings files list every miss with the pages read.
- **The Elements catalog matters.** Ready-made element questions go from 2/10 to 7/10 when the reader can see `/elements`, and 15 of 100 answers opened an Elements page. Only 47 of the 365 `/docs` pages link to it.
- **Conflicts found:** the CLI page gives `update` and `upgrade` in both orders, and the v7 page called `toUIMessageStreamResponse()` the v5 form while other pages use it on v7 (fixed in assistant-ui#10912).
