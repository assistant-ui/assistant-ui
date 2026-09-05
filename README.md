## aui-perf nightly record

_3 points · 2026-09-03T05:27:14.273Z to 2026-09-05T04:31:36.739Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.36µs |  |  | 34.36µs | 39.12µs | 3 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 396.45µs |  |  | 396.45µs | 445.37µs | 3 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.208ms |  |  | 6.208ms | 6.944ms | 3 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 174.16µs |  |  | 173.35µs | 189.67µs | 3 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.589ms |  |  | 1.589ms | 1.730ms | 3 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.176ms |  |  | 6.176ms | 6.895ms | 3 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.54µs |  |  | 6.54µs | 7.10µs | 3 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.20µs |  |  | 53.20µs | 55.89µs | 3 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 211.18µs |  |  | 211.18µs | 217.76µs | 3 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 579.03µs |  |  | 579.03µs | 621.65µs | 3 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.295ms |  |  | 5.295ms | 5.671ms | 3 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 21.223ms |  |  | 21.223ms | 22.884ms | 3 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 406.53µs |  |  | 406.53µs | 435.22µs | 3 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.826ms |  |  | 3.826ms | 4.086ms | 3 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 15.289ms |  |  | 15.188ms | 16.349ms | 3 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs |  |  | 0.11µs | 0.11µs | 3 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs |  |  | 0.18µs | 0.19µs | 3 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.06µs |  |  | 1.06µs | 1.16µs | 3 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs |  |  | 0.32µs | 0.35µs | 3 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.68µs |  |  | 1.67µs | 1.82µs | 3 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.02µs |  |  | 14.71µs | 16.34µs | 3 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 520.64µs |  |  | 520.64µs | 598.98µs | 3 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.039ms |  |  | 1.039ms | 1.116ms | 3 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.256ms |  |  | 4.256ms | 4.606ms | 3 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.117ms |  |  | 1.117ms | 1.147ms | 2 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.061ms |  |  | 1.061ms | 1.090ms | 2 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.570ms |  |  | 2.570ms | 2.649ms | 2 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.801ms |  |  | 1.801ms | 2.008ms | 3 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.085ms |  |  | 11.085ms | 12.144ms | 3 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 176.430ms |  |  | 176.430ms | 197.499ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 287.86µs |  |  | 287.86µs | 310.49µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.535ms |  |  | 1.535ms | 1.635ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 42.630ms |  |  | 42.270ms | 53.082ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.734ms |  |  | 1.582ms | 1.734ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.761ms |  |  | 1.566ms | 1.761ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.698ms |  |  | 1.513ms | 1.698ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.498ms |  |  | 1.412ms | 1.505ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 952.09µs |  |  | 891.43µs | 952.09µs | 3 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.427ms |  |  | 1.427ms | 1.479ms | 3 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.412ms |  |  | 1.412ms | 1.479ms | 3 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 185.46µs |  |  | 185.46µs | 186.93µs | 3 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.73µs |  |  | 61.93µs | 66.59µs | 3 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 752.28µs |  |  | 752.28µs | 832.67µs | 3 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 924.28µs |  |  | 911.35µs | 948.98µs | 3 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 973.03µs |  |  | 973.03µs | 1.047ms | 3 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 71.70µs |  |  | 71.70µs | 75.57µs | 3 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 643.86µs |  |  | 643.86µs | 681.72µs | 3 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 67.23µs |  |  | 67.23µs | 70.90µs | 3 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 659.75µs |  |  | 643.21µs | 689.67µs | 3 |

informational; points come from different runners of the same class, so read trends, not single deltas.
