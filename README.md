## aui-perf nightly record

_6 points · 2026-09-03T05:27:14.273Z to 2026-09-08T04:33:06.360Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.97µs |  |  | 33.37µs | 42.08µs | 6 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 411.54µs |  |  | 387.20µs | 471.76µs | 6 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.453ms |  |  | 6.085ms | 7.384ms | 6 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 176.73µs |  |  | 163.68µs | 208.89µs | 6 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.605ms |  |  | 1.558ms | 1.897ms | 6 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.390ms |  |  | 6.102ms | 7.535ms | 6 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.75µs |  |  | 6.47µs | 7.65µs | 6 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.97µs |  |  | 52.55µs | 59.72µs | 6 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 214.03µs |  |  | 209.65µs | 235.90µs | 6 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 594.39µs |  |  | 568.68µs | 654.19µs | 6 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.404ms |  |  | 5.187ms | 6.076ms | 6 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 21.737ms |  |  | 20.542ms | 24.024ms | 6 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 408.03µs |  |  | 397.34µs | 495.40µs | 6 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.733ms |  |  | 3.688ms | 4.316ms | 6 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 15.282ms |  |  | 14.907ms | 17.276ms | 6 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs |  |  | 0.10µs | 0.12µs | 6 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs |  |  | 0.17µs | 0.21µs | 6 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.09µs |  |  | 1.05µs | 1.21µs | 6 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs |  |  | 0.32µs | 0.38µs | 6 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.69µs |  |  | 1.67µs | 1.97µs | 6 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.91µs |  |  | 14.71µs | 16.98µs | 6 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 590.88µs |  |  | 520.64µs | 712.00µs | 6 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.115ms |  |  | 1.035ms | 1.214ms | 6 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.511ms |  |  | 4.235ms | 5.103ms | 6 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.138ms |  |  | 1.117ms | 1.147ms | 5 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.079ms |  |  | 1.049ms | 1.142ms | 5 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.470ms |  |  | 2.470ms | 2.914ms | 5 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.896ms |  |  | 1.719ms | 2.309ms | 6 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.039ms |  |  | 11.058ms | 13.665ms | 6 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 178.826ms |  |  | 164.638ms | 219.705ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 305.49µs |  |  | 265.63µs | 331.54µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.517ms |  |  | 1.517ms | 1.812ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 49.058ms |  |  | 37.332ms | 53.082ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.659ms |  |  | 1.582ms | 2.011ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.659ms |  |  | 1.566ms | 2.017ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.627ms |  |  | 1.513ms | 1.928ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.416ms |  |  | 1.412ms | 1.703ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 923.49µs |  |  | 891.43µs | 1.056ms | 6 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.416ms |  |  | 1.416ms | 1.756ms | 6 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.418ms |  |  | 1.403ms | 1.612ms | 6 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 188.17µs |  |  | 173.75µs | 199.08µs | 6 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.45µs |  |  | 61.52µs | 71.53µs | 6 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 745.27µs |  |  | 745.27µs | 928.53µs | 6 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 929.85µs |  |  | 752.30µs | 1.060ms | 6 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.032ms |  |  | 761.68µs | 1.242ms | 6 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 76.11µs |  |  | 37.02µs | 89.26µs | 6 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 657.76µs |  |  | 637.59µs | 765.54µs | 6 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 69.86µs |  |  | 34.67µs | 80.26µs | 6 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 669.63µs |  |  | 630.18µs | 738.13µs | 6 |

informational; points come from different runners of the same class, so read trends, not single deltas.
