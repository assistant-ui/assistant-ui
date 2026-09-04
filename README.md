## aui-perf nightly record

_2 points · 2026-09-03T05:27:14.273Z to 2026-09-04T04:34:03.487Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 39.12µs |  |  | 35.54µs | 39.12µs | 2 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 445.37µs |  |  | 410.96µs | 445.37µs | 2 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.944ms |  |  | 6.458ms | 6.944ms | 2 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 189.67µs |  |  | 173.35µs | 189.67µs | 2 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.730ms |  |  | 1.596ms | 1.730ms | 2 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.895ms |  |  | 6.331ms | 6.895ms | 2 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.10µs |  |  | 6.66µs | 7.10µs | 2 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.89µs |  |  | 54.03µs | 55.89µs | 2 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 217.76µs |  |  | 214.52µs | 217.76µs | 2 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 621.65µs |  |  | 589.93µs | 621.65µs | 2 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.671ms |  |  | 5.367ms | 5.671ms | 2 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 22.884ms |  |  | 21.301ms | 22.884ms | 2 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 435.22µs |  |  | 422.15µs | 435.22µs | 2 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 4.086ms |  |  | 3.837ms | 4.086ms | 2 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 16.349ms |  |  | 15.188ms | 16.349ms | 2 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs |  |  | 0.11µs | 0.11µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs |  |  | 0.18µs | 0.19µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.16µs |  |  | 1.08µs | 1.16µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs |  |  | 0.33µs | 0.35µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.82µs |  |  | 1.67µs | 1.82µs | 2 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.34µs |  |  | 14.71µs | 16.34µs | 2 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 598.98µs |  |  | 548.36µs | 598.98µs | 2 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.116ms |  |  | 1.054ms | 1.116ms | 2 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.606ms |  |  | 4.376ms | 4.606ms | 2 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.147ms |  |  | 1.147ms | 1.147ms | 1 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.090ms |  |  | 1.090ms | 1.090ms | 1 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.649ms |  |  | 2.649ms | 2.649ms | 1 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.008ms |  |  | 1.923ms | 2.008ms | 2 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.114ms |  |  | 12.114ms | 12.144ms | 2 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 197.499ms |  |  | 183.408ms | 197.499ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 310.49µs |  |  | 298.60µs | 310.49µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.635ms |  |  | 1.592ms | 1.635ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 53.082ms |  |  | 42.270ms | 53.082ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.714ms |  |  | 1.582ms | 1.714ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.725ms |  |  | 1.566ms | 1.725ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.670ms |  |  | 1.513ms | 1.670ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.505ms |  |  | 1.412ms | 1.505ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 934.18µs |  |  | 891.43µs | 934.18µs | 2 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.479ms |  |  | 1.428ms | 1.479ms | 2 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.479ms |  |  | 1.435ms | 1.479ms | 2 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 186.58µs |  |  | 186.58µs | 186.93µs | 2 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 66.59µs |  |  | 61.93µs | 66.59µs | 2 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 832.67µs |  |  | 756.03µs | 832.67µs | 2 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 948.98µs |  |  | 911.35µs | 948.98µs | 2 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.047ms |  |  | 1.017ms | 1.047ms | 2 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 75.57µs |  |  | 73.00µs | 75.57µs | 2 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 681.72µs |  |  | 670.77µs | 681.72µs | 2 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 70.90µs |  |  | 70.29µs | 70.90µs | 2 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 689.67µs |  |  | 643.21µs | 689.67µs | 2 |

informational; points come from different runners of the same class, so read trends, not single deltas.
