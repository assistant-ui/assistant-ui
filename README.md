## aui-perf nightly record

_13 points · 2026-09-03T05:27:14.273Z to 2026-09-15T04:39:10.200Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 601.08µs |  |  | 592.10µs | 601.08µs | 4 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 671.77µs |  |  | 668.74µs | 673.73µs | 4 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.78µs | -8.9% |  | 32.78µs | 42.08µs | 13 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 369.38µs | -10.2% |  | 369.38µs | 471.76µs | 13 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.755ms | -10.8% |  | 5.755ms | 7.384ms | 13 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 154.14µs | -12.8% |  | 154.14µs | 208.89µs | 13 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.425ms | -11.2% |  | 1.425ms | 1.897ms | 13 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.665ms | -11.3% |  | 5.665ms | 7.535ms | 13 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.57µs | -2.7% |  | 6.47µs | 7.65µs | 13 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.02µs | -1.8% |  | 52.55µs | 59.72µs | 13 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 208.75µs | -2.5% |  | 207.62µs | 235.90µs | 13 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 491.12µs | -17.4% |  | 487.10µs | 654.19µs | 13 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.524ms | -16.3% |  | 4.434ms | 6.076ms | 13 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.136ms | -16.6% |  | 17.461ms | 24.024ms | 13 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 329.45µs | -19.3% |  | 318.57µs | 495.40µs | 13 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.192ms | -14.5% |  | 2.939ms | 4.316ms | 13 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.557ms | -17.8% |  | 11.712ms | 17.276ms | 13 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.01µs |  |  | 23.84µs | 24.38µs | 4 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 257.45µs |  |  | 254.81µs | 267.79µs | 4 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.392ms |  |  | 1.384ms | 1.392ms | 4 |
| external-message-conversion › core: external message tool results › 100 matches | 27.25µs |  |  | 27.25µs | 28.10µs | 4 |
| external-message-conversion › core: external message tool results › 1000 matches | 274.56µs |  |  | 274.56µs | 286.34µs | 4 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.547ms |  |  | 1.515ms | 1.547ms | 4 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.74µs |  |  | 17.93µs | 19.53µs | 4 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 176.29µs |  |  | 174.80µs | 181.00µs | 4 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 997.90µs |  |  | 975.63µs | 1.006ms | 4 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -6.1% |  | 0.10µs | 0.12µs | 13 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.17µs | -5.9% |  | 0.17µs | 0.21µs | 13 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.03µs | -5.4% |  | 1.03µs | 1.21µs | 13 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -1.6% |  | 0.32µs | 0.38µs | 13 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.60µs | -5.1% |  | 1.60µs | 1.97µs | 13 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.09µs | -5.5% |  | 14.09µs | 16.98µs | 13 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 72.74µs |  |  | 72.23µs | 78.05µs | 5 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 452.51µs |  |  | 452.51µs | 479.55µs | 5 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 400.48µs | -32.2% |  | 400.48µs | 712.00µs | 13 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.067ms | -4.3% |  | 1.035ms | 1.214ms | 13 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.066ms | -9.9% |  | 4.013ms | 5.103ms | 13 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.132ms | -0.5% |  | 1.097ms | 1.156ms | 12 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.057ms | -2.0% |  | 1.049ms | 1.142ms | 12 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.899ms | +17.4% |  | 2.470ms | 3.478ms | 12 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.55µs |  |  | 2.55µs | 2.58µs | 3 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.02µs |  |  | 11.02µs | 12.13µs | 3 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.71µs |  |  | 24.71µs | 25.93µs | 3 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 224.64µs |  |  | 206.12µs | 224.64µs | 3 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.549ms | -18.3% |  | 1.549ms | 2.309ms | 13 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.736ms | -2.5% |  | 11.058ms | 13.665ms | 13 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 170.513ms | -4.6% |  | 164.638ms | 219.705ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 286.62µs | -6.2% |  | 265.63µs | 337.76µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.576ms | +3.9% |  | 1.517ms | 1.812ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 47.813ms | -2.5% |  | 37.332ms | 53.082ms | 13 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 195.87µs |  |  | 195.87µs | 203.26µs | 6 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.658ms |  |  | 1.635ms | 1.714ms | 6 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 857.46µs |  |  | 847.12µs | 874.47µs | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.631ms | -1.7% |  | 1.582ms | 2.011ms | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.591ms | -4.1% |  | 1.558ms | 2.017ms | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.552ms | -4.6% |  | 1.497ms | 1.928ms | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.434ms | +1.3% |  | 1.403ms | 1.703ms | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 924.30µs | +0.1% |  | 876.38µs | 1.056ms | 13 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.403ms | -0.9% |  | 1.387ms | 1.756ms | 13 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.384ms | -2.4% |  | 1.384ms | 1.612ms | 13 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 175.80µs | -6.6% |  | 173.75µs | 199.08µs | 13 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.35µs | -4.9% |  | 60.35µs | 71.53µs | 13 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 743.70µs | -0.2% |  | 731.55µs | 928.53µs | 13 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 756.14µs | -18.7% |  | 689.02µs | 1.060ms | 13 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 728.67µs | -29.4% |  | 693.05µs | 1.242ms | 13 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.28µs | -53.6% |  | 35.28µs | 89.26µs | 13 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 589.02µs | -10.5% |  | 589.02µs | 765.54µs | 13 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.49µs | -52.1% |  | 32.95µs | 80.26µs | 13 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 600.75µs | -10.3% |  | 586.81µs | 738.13µs | 13 |

informational; points come from different runners of the same class, so read trends, not single deltas.
