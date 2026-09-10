## aui-perf nightly record

_8 points · 2026-09-03T05:27:14.273Z to 2026-09-10T04:33:49.694Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.18µs |  |  | 33.23µs | 42.08µs | 8 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 374.52µs |  |  | 374.52µs | 471.76µs | 8 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.834ms |  |  | 5.834ms | 7.384ms | 8 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 159.07µs |  |  | 159.07µs | 208.89µs | 8 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.462ms |  |  | 1.462ms | 1.897ms | 8 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.830ms |  |  | 5.830ms | 7.535ms | 8 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.58µs |  |  | 6.47µs | 7.65µs | 8 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.35µs |  |  | 52.55µs | 59.72µs | 8 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 210.20µs |  |  | 209.65µs | 235.90µs | 8 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 504.07µs |  |  | 504.07µs | 654.19µs | 8 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.578ms |  |  | 4.518ms | 6.076ms | 8 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.505ms |  |  | 17.940ms | 24.024ms | 8 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 330.55µs |  |  | 330.55µs | 495.40µs | 8 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.048ms |  |  | 3.048ms | 4.316ms | 8 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.379ms |  |  | 12.379ms | 17.276ms | 8 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs |  |  | 0.10µs | 0.12µs | 8 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs |  |  | 0.17µs | 0.21µs | 8 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.09µs |  |  | 1.05µs | 1.21µs | 8 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs |  |  | 0.32µs | 0.38µs | 8 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.61µs |  |  | 1.61µs | 1.97µs | 8 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.35µs |  |  | 14.35µs | 16.98µs | 8 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 545.97µs |  |  | 520.64µs | 712.00µs | 8 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.051ms |  |  | 1.035ms | 1.214ms | 8 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.262ms |  |  | 4.235ms | 5.103ms | 8 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.120ms |  |  | 1.114ms | 1.147ms | 7 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.063ms |  |  | 1.049ms | 1.142ms | 7 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.523ms |  |  | 2.470ms | 2.932ms | 7 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.807ms |  |  | 1.719ms | 2.309ms | 8 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.808ms |  |  | 11.058ms | 13.665ms | 8 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 181.713ms |  |  | 164.638ms | 219.705ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 304.15µs |  |  | 265.63µs | 337.76µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.562ms |  |  | 1.517ms | 1.812ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 42.120ms |  |  | 37.332ms | 53.082ms | 8 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 200.85µs |  |  | 200.85µs | 200.85µs | 1 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.706ms |  |  | 1.706ms | 1.706ms | 1 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 872.27µs |  |  | 872.27µs | 872.27µs | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.746ms |  |  | 1.582ms | 2.011ms | 8 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.558ms |  |  | 1.558ms | 2.017ms | 8 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.497ms |  |  | 1.497ms | 1.928ms | 8 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.407ms |  |  | 1.407ms | 1.703ms | 8 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 914.76µs |  |  | 891.43µs | 1.056ms | 8 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.455ms |  |  | 1.387ms | 1.756ms | 8 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.452ms |  |  | 1.386ms | 1.612ms | 8 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 189.17µs |  |  | 173.75µs | 199.08µs | 8 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.00µs |  |  | 61.52µs | 71.53µs | 8 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 746.94µs |  |  | 731.55µs | 928.53µs | 8 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 765.49µs |  |  | 694.09µs | 1.060ms | 8 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 801.59µs |  |  | 703.79µs | 1.242ms | 8 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 39.87µs |  |  | 36.02µs | 89.26µs | 8 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 630.64µs |  |  | 596.56µs | 765.54µs | 8 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 51.74µs |  |  | 33.69µs | 80.26µs | 8 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 633.50µs |  |  | 586.81µs | 738.13µs | 8 |

informational; points come from different runners of the same class, so read trends, not single deltas.
