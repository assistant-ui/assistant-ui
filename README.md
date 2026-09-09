## aui-perf nightly record

_7 points · 2026-09-03T05:27:14.273Z to 2026-09-09T04:33:34.318Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.23µs |  |  | 33.23µs | 42.08µs | 7 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 376.15µs |  |  | 376.15µs | 471.76µs | 7 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.878ms |  |  | 5.878ms | 7.384ms | 7 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 167.00µs |  |  | 163.68µs | 208.89µs | 7 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.479ms |  |  | 1.479ms | 1.897ms | 7 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.859ms |  |  | 5.859ms | 7.535ms | 7 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.81µs |  |  | 6.47µs | 7.65µs | 7 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.84µs |  |  | 52.55µs | 59.72µs | 7 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 212.94µs |  |  | 209.65µs | 235.90µs | 7 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 504.35µs |  |  | 504.35µs | 654.19µs | 7 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.518ms |  |  | 4.518ms | 6.076ms | 7 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.940ms |  |  | 17.940ms | 24.024ms | 7 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 334.60µs |  |  | 334.60µs | 495.40µs | 7 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.082ms |  |  | 3.082ms | 4.316ms | 7 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.484ms |  |  | 12.484ms | 17.276ms | 7 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs |  |  | 0.10µs | 0.12µs | 7 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs |  |  | 0.17µs | 0.21µs | 7 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.11µs |  |  | 1.05µs | 1.21µs | 7 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs |  |  | 0.32µs | 0.38µs | 7 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.63µs |  |  | 1.63µs | 1.97µs | 7 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.65µs |  |  | 14.65µs | 16.98µs | 7 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 547.66µs |  |  | 520.64µs | 712.00µs | 7 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.048ms |  |  | 1.035ms | 1.214ms | 7 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.254ms |  |  | 4.235ms | 5.103ms | 7 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.114ms |  |  | 1.114ms | 1.147ms | 6 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.062ms |  |  | 1.049ms | 1.142ms | 6 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.932ms |  |  | 2.470ms | 2.932ms | 6 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.946ms |  |  | 1.719ms | 2.309ms | 7 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.495ms |  |  | 11.058ms | 13.665ms | 7 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 187.930ms |  |  | 164.638ms | 219.705ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 337.76µs |  |  | 265.63µs | 337.76µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.704ms |  |  | 1.517ms | 1.812ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 42.584ms |  |  | 37.332ms | 53.082ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.687ms |  |  | 1.582ms | 2.011ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.656ms |  |  | 1.566ms | 2.017ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.646ms |  |  | 1.513ms | 1.928ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.417ms |  |  | 1.412ms | 1.703ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 920.33µs |  |  | 891.43µs | 1.056ms | 7 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.387ms |  |  | 1.387ms | 1.756ms | 7 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.386ms |  |  | 1.386ms | 1.612ms | 7 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 181.87µs |  |  | 173.75µs | 199.08µs | 7 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.44µs |  |  | 61.52µs | 71.53µs | 7 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 731.55µs |  |  | 731.55µs | 928.53µs | 7 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 694.09µs |  |  | 694.09µs | 1.060ms | 7 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 703.79µs |  |  | 703.79µs | 1.242ms | 7 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.02µs |  |  | 36.02µs | 89.26µs | 7 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 596.56µs |  |  | 596.56µs | 765.54µs | 7 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.69µs |  |  | 33.69µs | 80.26µs | 7 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 586.81µs |  |  | 586.81µs | 738.13µs | 7 |

informational; points come from different runners of the same class, so read trends, not single deltas.
