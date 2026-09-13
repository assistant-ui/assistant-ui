## aui-perf nightly record

_11 points · 2026-09-03T05:27:14.273Z to 2026-09-13T04:37:23.714Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 592.10µs |  |  | 592.10µs | 599.46µs | 2 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 673.73µs |  |  | 672.32µs | 673.73µs | 2 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.33µs | -0.1% |  | 33.23µs | 42.08µs | 11 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 375.39µs | -3.0% |  | 372.61µs | 471.76µs | 11 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.840ms | -4.0% |  | 5.770ms | 7.384ms | 11 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 154.84µs | -5.4% |  | 154.84µs | 208.89µs | 11 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.454ms | -6.6% |  | 1.445ms | 1.897ms | 11 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.783ms | -5.2% |  | 5.725ms | 7.535ms | 11 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.56µs | +1.3% |  | 6.47µs | 7.65µs | 11 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 52.72µs | +0.3% |  | 52.55µs | 59.72µs | 11 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 207.62µs | -1.0% |  | 207.62µs | 235.90µs | 11 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 487.10µs | -14.3% |  | 487.10µs | 654.19µs | 11 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.470ms | -13.8% |  | 4.434ms | 6.076ms | 11 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.743ms | -13.6% |  | 17.461ms | 24.024ms | 11 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 318.57µs | -19.8% |  | 318.57µs | 495.40µs | 11 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.986ms | -19.0% |  | 2.939ms | 4.316ms | 11 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.058ms | -19.1% |  | 11.712ms | 17.276ms | 11 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 23.84µs |  |  | 23.84µs | 23.98µs | 2 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 258.58µs |  |  | 254.81µs | 258.58µs | 2 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.384ms |  |  | 1.384ms | 1.386ms | 2 |
| external-message-conversion › core: external message tool results › 100 matches | 27.64µs |  |  | 27.64µs | 27.96µs | 2 |
| external-message-conversion › core: external message tool results › 1000 matches | 280.29µs |  |  | 280.29µs | 284.37µs | 2 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.515ms |  |  | 1.515ms | 1.520ms | 2 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 17.93µs |  |  | 17.93µs | 19.53µs | 2 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 174.80µs |  |  | 174.80µs | 180.53µs | 2 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 975.63µs |  |  | 975.63µs | 985.47µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -4.9% |  | 0.10µs | 0.12µs | 11 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs | +2.3% |  | 0.17µs | 0.21µs | 11 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.05µs | -0.1% |  | 1.05µs | 1.21µs | 11 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | +2.5% |  | 0.32µs | 0.38µs | 11 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.65µs | -1.4% |  | 1.61µs | 1.97µs | 11 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.54µs | -7.1% |  | 14.33µs | 16.98µs | 11 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.14µs |  |  | 73.14µs | 78.05µs | 3 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 473.27µs |  |  | 463.87µs | 479.55µs | 3 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 402.68µs | -23.3% |  | 402.68µs | 712.00µs | 11 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.062ms | +2.5% |  | 1.035ms | 1.214ms | 11 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.013ms | -5.2% |  | 4.013ms | 5.103ms | 11 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.131ms | +0.9% |  | 1.097ms | 1.147ms | 10 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.059ms | +1.0% |  | 1.049ms | 1.142ms | 10 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.726ms | -6.4% |  | 2.470ms | 3.478ms | 10 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.55µs |  |  | 2.55µs | 2.55µs | 1 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.45µs |  |  | 11.45µs | 11.45µs | 1 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.93µs |  |  | 25.93µs | 25.93µs | 1 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 206.12µs |  |  | 206.12µs | 206.12µs | 1 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.582ms | -7.9% |  | 1.582ms | 2.309ms | 11 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.768ms | +6.4% |  | 11.058ms | 13.665ms | 11 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 173.759ms | +5.5% |  | 164.638ms | 219.705ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 283.94µs | +6.9% |  | 265.63µs | 337.76µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.605ms | +2.7% |  | 1.517ms | 1.812ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 49.171ms | +31.7% |  | 37.332ms | 53.082ms | 11 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 199.89µs |  |  | 199.01µs | 203.26µs | 4 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.714ms |  |  | 1.635ms | 1.714ms | 4 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 860.56µs |  |  | 847.12µs | 872.27µs | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.640ms | -0.8% |  | 1.582ms | 2.011ms | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.585ms | -2.2% |  | 1.558ms | 2.017ms | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.544ms | -4.1% |  | 1.497ms | 1.928ms | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.420ms | -1.0% |  | 1.403ms | 1.703ms | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 901.08µs | +0.2% |  | 888.89µs | 1.056ms | 11 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.436ms | -0.6% |  | 1.387ms | 1.756ms | 11 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.434ms | +2.2% |  | 1.386ms | 1.612ms | 11 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 180.88µs | +4.1% |  | 173.75µs | 199.08µs | 11 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.86µs | -1.1% |  | 60.86µs | 71.53µs | 11 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 758.31µs | +0.4% |  | 731.55µs | 928.53µs | 11 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 701.18µs | -6.8% |  | 694.09µs | 1.060ms | 11 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 693.05µs | -9.0% |  | 693.05µs | 1.242ms | 11 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.74µs | -3.5% |  | 35.74µs | 89.26µs | 11 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 621.64µs | -2.5% |  | 596.56µs | 765.54µs | 11 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.84µs | -2.4% |  | 32.95µs | 80.26µs | 11 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 594.79µs | -5.6% |  | 586.81µs | 738.13µs | 11 |

informational; points come from different runners of the same class, so read trends, not single deltas.
