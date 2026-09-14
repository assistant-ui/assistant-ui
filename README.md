## aui-perf nightly record

_12 points · 2026-09-03T05:27:14.273Z to 2026-09-14T04:41:28.489Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 599.45µs |  |  | 592.10µs | 599.46µs | 3 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 668.74µs |  |  | 668.74µs | 673.73µs | 3 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.05µs | -21.5% |  | 33.05µs | 42.08µs | 12 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 373.68µs | -20.8% |  | 372.61µs | 471.76µs | 12 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.853ms | -20.7% |  | 5.770ms | 7.384ms | 12 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 158.70µs | -24.0% |  | 154.84µs | 208.89µs | 12 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.472ms | -22.4% |  | 1.445ms | 1.897ms | 12 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.882ms | -21.9% |  | 5.725ms | 7.535ms | 12 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.70µs | -12.4% |  | 6.47µs | 7.65µs | 12 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.46µs | -10.5% |  | 52.55µs | 59.72µs | 12 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 211.40µs | -10.4% |  | 207.62µs | 235.90µs | 12 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 495.29µs | -24.3% |  | 487.10µs | 654.19µs | 12 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.523ms | -25.6% |  | 4.434ms | 6.076ms | 12 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.935ms | -25.3% |  | 17.461ms | 24.024ms | 12 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 329.49µs | -33.5% |  | 318.57µs | 495.40µs | 12 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.090ms | -28.4% |  | 2.939ms | 4.316ms | 12 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.568ms | -27.3% |  | 11.712ms | 17.276ms | 12 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.38µs |  |  | 23.84µs | 24.38µs | 3 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 267.79µs |  |  | 254.81µs | 267.79µs | 3 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.385ms |  |  | 1.384ms | 1.386ms | 3 |
| external-message-conversion › core: external message tool results › 100 matches | 28.10µs |  |  | 27.64µs | 28.10µs | 3 |
| external-message-conversion › core: external message tool results › 1000 matches | 286.34µs |  |  | 280.29µs | 286.34µs | 3 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.516ms |  |  | 1.515ms | 1.520ms | 3 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.62µs |  |  | 17.93µs | 19.53µs | 3 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 181.00µs |  |  | 174.80µs | 181.00µs | 3 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.006ms |  |  | 975.63µs | 1.006ms | 3 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -15.7% |  | 0.10µs | 0.12µs | 12 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.17µs | -16.2% |  | 0.17µs | 0.21µs | 12 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.09µs | -10.1% |  | 1.05µs | 1.21µs | 12 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs | -17.5% |  | 0.32µs | 0.38µs | 12 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.63µs | -17.6% |  | 1.61µs | 1.97µs | 12 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.35µs | -15.5% |  | 14.33µs | 16.98µs | 12 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 72.23µs |  |  | 72.23µs | 78.05µs | 4 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 474.87µs |  |  | 463.87µs | 479.55µs | 4 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 412.05µs | -42.1% |  | 402.68µs | 712.00µs | 12 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.100ms | -9.4% |  | 1.035ms | 1.214ms | 12 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.091ms | -19.8% |  | 4.013ms | 5.103ms | 12 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.156ms | +2.6% |  | 1.097ms | 1.156ms | 11 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.066ms | -6.6% |  | 1.049ms | 1.142ms | 11 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.578ms | +3.3% |  | 2.470ms | 3.478ms | 11 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.58µs |  |  | 2.55µs | 2.58µs | 2 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.13µs |  |  | 11.45µs | 12.13µs | 2 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.86µs |  |  | 24.86µs | 25.93µs | 2 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 216.15µs |  |  | 206.12µs | 216.15µs | 2 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.738ms | -24.7% |  | 1.582ms | 2.309ms | 12 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.058ms | -4.4% |  | 11.058ms | 13.665ms | 12 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 184.510ms | -16.0% |  | 164.638ms | 219.705ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 291.30µs | -12.1% |  | 265.63µs | 337.76µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.768ms | -2.4% |  | 1.517ms | 1.812ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 46.237ms | -8.5% |  | 37.332ms | 53.082ms | 12 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 199.33µs |  |  | 199.01µs | 203.26µs | 5 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.713ms |  |  | 1.635ms | 1.714ms | 5 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 874.47µs |  |  | 847.12µs | 874.47µs | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.610ms | -19.9% |  | 1.582ms | 2.011ms | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.584ms | -21.4% |  | 1.558ms | 2.017ms | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.553ms | -19.5% |  | 1.497ms | 1.928ms | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.464ms | -14.0% |  | 1.403ms | 1.703ms | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 876.38µs | -17.0% |  | 876.38µs | 1.056ms | 12 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.411ms | -19.7% |  | 1.387ms | 1.756ms | 12 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.403ms | -13.0% |  | 1.386ms | 1.612ms | 12 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 189.05µs | -5.0% |  | 173.75µs | 199.08µs | 12 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.83µs | -15.0% |  | 60.83µs | 71.53µs | 12 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 743.09µs | -20.0% |  | 731.55µs | 928.53µs | 12 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 689.02µs | -35.0% |  | 689.02µs | 1.060ms | 12 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 693.81µs | -44.2% |  | 693.05µs | 1.242ms | 12 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.53µs | -59.1% |  | 35.74µs | 89.26µs | 12 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 615.43µs | -19.6% |  | 596.56µs | 765.54µs | 12 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.67µs | -55.6% |  | 32.95µs | 80.26µs | 12 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 596.12µs | -19.2% |  | 586.81µs | 738.13µs | 12 |

informational; points come from different runners of the same class, so read trends, not single deltas.
