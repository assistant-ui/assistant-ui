## aui-perf nightly record

_4 points · 2026-09-03T05:27:14.273Z to 2026-09-06T04:31:57.993Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.37µs |  |  | 33.37µs | 39.12µs | 4 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 387.20µs |  |  | 387.20µs | 445.37µs | 4 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.085ms |  |  | 6.085ms | 6.944ms | 4 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 163.68µs |  |  | 163.68µs | 189.67µs | 4 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.558ms |  |  | 1.558ms | 1.730ms | 4 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.102ms |  |  | 6.102ms | 6.895ms | 4 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.47µs |  |  | 6.47µs | 7.10µs | 4 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 52.55µs |  |  | 52.55µs | 55.89µs | 4 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 209.65µs |  |  | 209.65µs | 217.76µs | 4 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 568.68µs |  |  | 568.68µs | 621.65µs | 4 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.187ms |  |  | 5.187ms | 5.671ms | 4 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.542ms |  |  | 20.542ms | 22.884ms | 4 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 397.34µs |  |  | 397.34µs | 435.22µs | 4 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.688ms |  |  | 3.688ms | 4.086ms | 4 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 14.907ms |  |  | 14.907ms | 16.349ms | 4 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs |  |  | 0.10µs | 0.11µs | 4 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.17µs |  |  | 0.17µs | 0.19µs | 4 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.05µs |  |  | 1.05µs | 1.16µs | 4 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs |  |  | 0.32µs | 0.35µs | 4 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.67µs |  |  | 1.67µs | 1.82µs | 4 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.65µs |  |  | 14.71µs | 16.34µs | 4 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 524.90µs |  |  | 520.64µs | 598.98µs | 4 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.035ms |  |  | 1.035ms | 1.116ms | 4 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.235ms |  |  | 4.235ms | 4.606ms | 4 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.121ms |  |  | 1.117ms | 1.147ms | 3 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.049ms |  |  | 1.049ms | 1.090ms | 3 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.914ms |  |  | 2.570ms | 2.914ms | 3 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.719ms |  |  | 1.719ms | 2.008ms | 4 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.058ms |  |  | 11.058ms | 12.144ms | 4 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 164.638ms |  |  | 164.638ms | 197.499ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 265.63µs |  |  | 265.63µs | 310.49µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.563ms |  |  | 1.535ms | 1.635ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 37.332ms |  |  | 37.332ms | 53.082ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.653ms |  |  | 1.582ms | 1.734ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.621ms |  |  | 1.566ms | 1.761ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.610ms |  |  | 1.513ms | 1.698ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.435ms |  |  | 1.412ms | 1.505ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 899.36µs |  |  | 891.43µs | 952.09µs | 4 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.445ms |  |  | 1.427ms | 1.479ms | 4 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.403ms |  |  | 1.403ms | 1.479ms | 4 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 173.75µs |  |  | 173.75µs | 186.93µs | 4 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.52µs |  |  | 61.52µs | 66.59µs | 4 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 755.53µs |  |  | 752.28µs | 832.67µs | 4 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 752.30µs |  |  | 752.30µs | 948.98µs | 4 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 761.68µs |  |  | 761.68µs | 1.047ms | 4 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 37.02µs |  |  | 37.02µs | 75.57µs | 4 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 637.59µs |  |  | 637.59µs | 681.72µs | 4 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.67µs |  |  | 34.67µs | 70.90µs | 4 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 630.18µs |  |  | 630.18µs | 689.67µs | 4 |

informational; points come from different runners of the same class, so read trends, not single deltas.
