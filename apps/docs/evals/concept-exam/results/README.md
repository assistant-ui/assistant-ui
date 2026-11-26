# Results

Each run has its answers (`<run>.json`, with the pages the reader opened) and its grades (`<run>-grades.json`). Rerun the numbers with `node ../score.mjs score <run>.json <run>-grades.json` and `node ../score.mjs gaps <run>.json`.

The reader is `claude -p` with Sonnet. "Before" is main at a097902a8. "After" is the same commit plus the concept fixes from AUI-337 (stopping, errors, waiting tool calls, adapters, the components you own, Python data stream, status reasons, reasoning).

| Run | Correct | Weighted | "The docs don't say" sentences | Pages per question |
| --- | --- | --- | --- | --- |
| `before-deep` | 32/38 (84%) | 92% | 30 | 5.4 |
| `after-deep` | 38/38 (100%) | 100% | 15 | 4.4 |
| `before-skim` | 30/38 (79%) | 89% | 23 | 2.3 |
| `after-skim` | 37/38 (97%) | 99% | 15 | 2.1 |

`followup-deep.json` reruns q15, q16 and q28 after two more edits (where branches live, and that `append` of a user message starts a reply): the deep reader no longer hedges on either.

## What the reader got wrong before

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

After the fixes, the only miss is q22 for the skim reader, which reads only the Tool UI page.

## What the readers still hedge on

From `node ../score.mjs gaps after-deep.json`; these are the next candidates.

- Sequencing `switchToNewThread()` and `append()` in one click.
- What sending an edit during a run does.
- Whether unmounting a provider removes the tools it registered.
- Which files `init` changes.
- How the Message primitive page's "`MessagePrimitive.Root` provides message context" relates to the scope `ThreadPrimitive.Messages` creates.
- Whether attachment parts reach a `LocalRuntime` adapter in `content` or in `attachments`.
- What text an AI SDK error shows when the request fails before any stream.
