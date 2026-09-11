## aui-perf nightly record

_9 points · 2026-09-03T05:27:14.273Z to 2026-09-11T04:34:12.599Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.33µs | -14.8% |  | 33.23µs | 42.08µs | 9 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 372.61µs | -16.3% |  | 372.61µs | 471.76µs | 9 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.770ms | -16.9% |  | 5.770ms | 7.384ms | 9 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 163.09µs | -14.0% |  | 159.07µs | 208.89µs | 9 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.445ms | -16.5% |  | 1.445ms | 1.897ms | 9 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.725ms | -17.0% |  | 5.725ms | 7.535ms | 9 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.61µs | -6.9% |  | 6.47µs | 7.65µs | 9 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.86µs | -3.6% |  | 52.55µs | 59.72µs | 9 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 211.23µs | -3.0% |  | 209.65µs | 235.90µs | 9 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 497.45µs | -20.0% |  | 497.45µs | 654.19µs | 9 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.549ms | -19.8% |  | 4.518ms | 6.076ms | 9 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.889ms | -21.8% |  | 17.889ms | 24.024ms | 9 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 341.35µs | -21.6% |  | 330.55µs | 495.40µs | 9 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.076ms | -24.7% |  | 3.048ms | 4.316ms | 9 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.159ms | -25.6% |  | 12.159ms | 17.276ms | 9 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -1.6% |  | 0.10µs | 0.12µs | 9 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs | -4.1% |  | 0.17µs | 0.21µs | 9 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.08µs | -6.9% |  | 1.05µs | 1.21µs | 9 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | -2.7% |  | 0.32µs | 0.38µs | 9 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.64µs | -9.7% |  | 1.61µs | 1.97µs | 9 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.85µs | -9.2% |  | 14.35µs | 16.98µs | 9 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 78.05µs |  |  | 78.05µs | 78.05µs | 1 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 479.55µs |  |  | 479.55µs | 479.55µs | 1 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 571.88µs | -4.5% |  | 520.64µs | 712.00µs | 9 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.052ms | -5.7% |  | 1.035ms | 1.214ms | 9 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.292ms | -6.8% |  | 4.235ms | 5.103ms | 9 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.097ms | -4.4% |  | 1.097ms | 1.147ms | 8 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.070ms | -1.9% |  | 1.049ms | 1.142ms | 8 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.624ms | -1.0% |  | 2.470ms | 2.932ms | 8 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.882ms | -6.3% |  | 1.719ms | 2.309ms | 9 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.760ms | -2.9% |  | 11.058ms | 13.665ms | 9 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 181.038ms | -8.3% |  | 164.638ms | 219.705ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 336.32µs | +8.3% |  | 265.63µs | 337.76µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.713ms | +4.8% |  | 1.517ms | 1.812ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 49.847ms | -6.1% |  | 37.332ms | 53.082ms | 9 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 203.26µs |  |  | 200.85µs | 203.26µs | 2 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.679ms |  |  | 1.679ms | 1.706ms | 2 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 867.74µs |  |  | 867.74µs | 872.27µs | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.652ms | -3.6% |  | 1.582ms | 2.011ms | 9 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.665ms | -3.4% |  | 1.558ms | 2.017ms | 9 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.575ms | -5.7% |  | 1.497ms | 1.928ms | 9 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.403ms | -6.8% |  | 1.403ms | 1.703ms | 9 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 888.89µs | -4.8% |  | 888.89µs | 1.056ms | 9 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.493ms | +0.9% |  | 1.387ms | 1.756ms | 9 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.430ms | -3.4% |  | 1.386ms | 1.612ms | 9 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 184.03µs | -1.4% |  | 173.75µs | 199.08µs | 9 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.44µs | -6.2% |  | 61.52µs | 71.53µs | 9 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 773.66µs | -7.1% |  | 731.55µs | 928.53µs | 9 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 717.36µs | -24.4% |  | 694.09µs | 1.060ms | 9 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 726.16µs | -30.7% |  | 703.79µs | 1.242ms | 9 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.08µs | -52.2% |  | 36.02µs | 89.26µs | 9 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 603.09µs | -11.5% |  | 596.56µs | 765.54µs | 9 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.30µs | -51.6% |  | 33.69µs | 80.26µs | 9 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 595.91µs | -13.6% |  | 586.81µs | 738.13µs | 9 |

informational; points come from different runners of the same class, so read trends, not single deltas.
