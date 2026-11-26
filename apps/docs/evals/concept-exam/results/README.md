# Results

Each run has its answers (`<run>.json`, with every page the reader opened and whether a skim run went over its three pages) and its grades (`<run>-grades.json`). Rerun the numbers with `node ../score.mjs score <run>.json <run>-grades.json` and `node ../score.mjs gaps <run>.json`.

The reader is `claude -p` with Sonnet. "Before" is main at 5439bc338, this PR's base. "After" is this PR's docs. The after runs ask the same 38 questions whose misses drove the edits, so they show the gaps closed, not how the docs do on questions nobody tuned for.

| Run | Correct | Weighted | "The docs don't say" sentences | Pages per question |
| --- | --- | --- | --- | --- |
| `before-deep` | 32/38 (84%) | 92% | 28 | 5.8 |
| `after-deep` | 38/38 (100%) | 100% | 19 | 4.8 |
| `before-skim` | 30/38 (79%) | 89% | 25 | 2.4 |
| `after-skim` | 37/38 (97%) | 99% | 13 | 2.1 |

`first-pass/` holds the first recording, made before #10885 landed (main at a097902a8, and the same commit plus round one of these edits). It found the same six gaps for the deep reader and the same eight for the skim reader, and it scored the same after the fixes: 38/38 deep, 37/38 skim. `first-pass/followup-deep.json` reruns q15, q16 and q28 after the edits on where branches live and on `append`.

## What the reader got wrong or only partly right before

| Question | Deep | Skim | Why |
| --- | --- | --- | --- |
| q04 Python backend | partly | partly | No page said a Python service can emit the data stream. |
| q12 Reasoning | correct | partly | No concept page said how reasoning gets from an AI SDK route to the client. |
| q22 Tool result from the UI | correct | partly | The Tool UI page says the assistant always continues after `addResult`; with `useChatRuntime` it needs `sendAutomaticallyWhen`. |
| q25 Styling | partly | partly | No page on theming, editing installed elements, or whether Tailwind and shadcn are needed. |
| q26 CLI | partly | partly | No page said which code is copied and which stays a package. |
| q31 Adapters | partly | partly | No page said what happens without each adapter; the speech guide said `Speak` ignores a missing one. |
| q33 Stop | partly | partly | The composer page said `ComposerPrimitive.Cancel` only ends edits; nothing said streamed text stays. |
| q34 Errors | partly | partly | No page said where the error text comes from. |

After the fixes, the only miss is q22 for the skim reader, which reads only the Tool UI page. No skim run opened more than three pages, and no reader failed.

Each answer is one sample, so the skim reader's choice of pages varies between runs: in one after run it skipped the data stream page and missed the Python path (q04), which is why the backend picker now names the Python package too.

## What the readers still hedge on

From `node ../score.mjs gaps after-deep.json`; these are the next candidates.

- The AI SDK overview shows `result.toUIMessageStreamResponse()` and the v7 page `createUIMessageStreamResponse()`, without saying both work.
- Sequencing `switchToNewThread()` and `append()` in one click.
- What sending an edit during a run does.
- Whether unmounting a provider removes the tools it registered.
- Which files `init` changes, and where they go in a `src/` project.
- What the AI SDK runtime shows when the request fails before any assistant message exists.
- How a single-thread app restores earlier messages after a reload with resumable streams.
