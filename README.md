## aui-perf nightly record

_5 points · 2026-09-03T05:27:14.273Z to 2026-09-07T04:35:23.758Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 42.08µs |  |  | 33.37µs | 42.08µs | 5 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 471.76µs |  |  | 387.20µs | 471.76µs | 5 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 7.384ms |  |  | 6.085ms | 7.384ms | 5 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 208.89µs |  |  | 163.68µs | 208.89µs | 5 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.897ms |  |  | 1.558ms | 1.897ms | 5 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 7.535ms |  |  | 6.102ms | 7.535ms | 5 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.65µs |  |  | 6.47µs | 7.65µs | 5 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 59.72µs |  |  | 52.55µs | 59.72µs | 5 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 235.90µs |  |  | 209.65µs | 235.90µs | 5 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 654.19µs |  |  | 568.68µs | 654.19µs | 5 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.076ms |  |  | 5.187ms | 6.076ms | 5 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 24.024ms |  |  | 20.542ms | 24.024ms | 5 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 495.40µs |  |  | 397.34µs | 495.40µs | 5 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 4.316ms |  |  | 3.688ms | 4.316ms | 5 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 17.276ms |  |  | 14.907ms | 17.276ms | 5 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs |  |  | 0.10µs | 0.12µs | 5 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs |  |  | 0.17µs | 0.21µs | 5 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs |  |  | 1.05µs | 1.21µs | 5 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.38µs |  |  | 0.32µs | 0.38µs | 5 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.97µs |  |  | 1.67µs | 1.97µs | 5 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.98µs |  |  | 14.71µs | 16.98µs | 5 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 712.00µs |  |  | 520.64µs | 712.00µs | 5 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.214ms |  |  | 1.035ms | 1.214ms | 5 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.103ms |  |  | 4.235ms | 5.103ms | 5 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.127ms |  |  | 1.117ms | 1.147ms | 4 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.142ms |  |  | 1.049ms | 1.142ms | 4 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.496ms |  |  | 2.496ms | 2.914ms | 4 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.309ms |  |  | 1.719ms | 2.309ms | 5 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.665ms |  |  | 11.058ms | 13.665ms | 5 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 219.705ms |  |  | 164.638ms | 219.705ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 331.54µs |  |  | 265.63µs | 331.54µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.812ms |  |  | 1.535ms | 1.812ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 50.517ms |  |  | 37.332ms | 53.082ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.011ms |  |  | 1.582ms | 2.011ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.017ms |  |  | 1.566ms | 2.017ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.928ms |  |  | 1.513ms | 1.928ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.703ms |  |  | 1.412ms | 1.703ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.056ms |  |  | 891.43µs | 1.056ms | 5 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.756ms |  |  | 1.427ms | 1.756ms | 5 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.612ms |  |  | 1.403ms | 1.612ms | 5 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 199.08µs |  |  | 173.75µs | 199.08µs | 5 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 71.53µs |  |  | 61.52µs | 71.53µs | 5 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 928.53µs |  |  | 752.28µs | 928.53µs | 5 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.060ms |  |  | 752.30µs | 1.060ms | 5 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.242ms |  |  | 761.68µs | 1.242ms | 5 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 89.26µs |  |  | 37.02µs | 89.26µs | 5 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 765.54µs |  |  | 637.59µs | 765.54µs | 5 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 80.26µs |  |  | 34.67µs | 80.26µs | 5 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 738.13µs |  |  | 630.18µs | 738.13µs | 5 |

informational; points come from different runners of the same class, so read trends, not single deltas.
