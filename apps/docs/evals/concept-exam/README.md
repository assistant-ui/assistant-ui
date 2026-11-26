# Concept exam

Can a developer who reads only the human docs answer the questions they need answered to use assistant-ui well? This exam asks a fresh headless model whose file access is limited to the docs pages, and which is told not to use what it already knows, grades each answer against a reference written from the source code, and lists the concepts the docs fail to teach.

## What's here

| File | What it is |
| --- | --- |
| `questions.json` | 38 concept questions (runtimes, threads, messages, branching, tools, UI layers, state, adapters, stopping, errors, platforms), each with a reference answer and the key points a correct answer states. The topics come from what readers ask the docs assistant; the wording is ours. The references come from the code, not the docs. |
| `extract.mjs` | Turns `content/docs` (or another checkout's, as a second argument) into one Markdown file per page plus `INDEX.md` in sidebar order. Imports and MDX comments go; each Flow diagram becomes the text version it ships for screen readers. It only replaces an empty folder or one it wrote before. |
| `reader-deep.md` | The reader's fixed prompt when it may read and search as many pages as it likes. |
| `reader-skim.md` | The fixed prompt for a reader who opens at most three pages picked from the index and can't search, like a developer skimming before briefing an agent. |
| `run.mjs` | Asks every question of `claude -p` in the extracted folder with only `Read` (skim) or `Read`, `Grep` and `Glob` (deep), `--restricted` and `--safe-mode`, so it can't reach the code, the network or any settings. Records each answer, every page it opened successfully (`pages`; the answer's own `Pages:` line lists the ones it relied on), and `overBudget` when a skim reader opened more than three. |
| `score.mjs` | Prints a grading worksheet, the score from a grades file, or (`gaps`) the sentences where the reader says the docs leave something out, which needs no grader. |
| `results/` | The answers and grades from each recorded run. |

## Running it

```bash
cd apps/docs/evals/concept-exam
node extract.mjs /tmp/docs-text
node run.mjs --docs /tmp/docs-text --reader deep --out /tmp/deep.json
node run.mjs --docs /tmp/docs-text --reader skim --out /tmp/skim.json
node score.mjs worksheet /tmp/deep.json > /tmp/deep-worksheet.md
# grade each answer into a JSON file: { "q01": { "grade": "correct" }, ... }
node score.mjs score /tmp/deep.json /tmp/deep-grades.json
```

`--model` picks the reader (default `sonnet`), `--only q04,q33` reruns some questions, and `--concurrency` sets how many run at once. A full run of 38 questions takes three to six minutes.

The sandbox was checked: asked to read a file outside the folder, the reader gets "outside <folder>; --restricted confines the file tools to the working directory" for both `Read` and `Glob`. Its prior knowledge is held back only by the prompt.

## Grading

Grade each answer against the question's key points, not its wording:

- **correct**: states every key point and contradicts none.
- **partly**: states some, or hedges a key point with "the docs don't say".
- **wrong**: states something false about a key point.
- **missing**: the reader found nothing.

The score is the share graded correct; the weighted score counts partly as half. The notes on the ones that aren't correct are the point of the exam: they name the concept the docs don't teach and where the reader looked for it.

A reader's hedges ("the docs don't say X") are findings too, even on a correct answer. They show where a page leaves the reader guessing.

## Results

| Run | Deep reader | Skim reader |
| --- | --- | --- |
| Before: main at a097902a8 | 32/38 correct (84%) | 30/38 correct (79%) |
| After: the concept fixes from AUI-337 | 38/38 correct (100%) | 37/38 correct (97%) |

[results/](results/README.md) has every answer, every grade, and what the readers missed and still hedge on.
