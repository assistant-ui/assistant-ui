## aui-perf nightly record

_1 points · 2026-09-03T05:27:14.273Z to 2026-09-03T05:27:14.273Z · latest runner: AMD EPYC · Node v24.20.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.54µs |  |  | 35.54µs | 35.54µs | 1 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 410.96µs |  |  | 410.96µs | 410.96µs | 1 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.458ms |  |  | 6.458ms | 6.458ms | 1 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 173.35µs |  |  | 173.35µs | 173.35µs | 1 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.596ms |  |  | 1.596ms | 1.596ms | 1 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.331ms |  |  | 6.331ms | 6.331ms | 1 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.66µs |  |  | 6.66µs | 6.66µs | 1 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 54.03µs |  |  | 54.03µs | 54.03µs | 1 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 214.52µs |  |  | 214.52µs | 214.52µs | 1 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 589.93µs |  |  | 589.93µs | 589.93µs | 1 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.367ms |  |  | 5.367ms | 5.367ms | 1 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 21.301ms |  |  | 21.301ms | 21.301ms | 1 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 422.15µs |  |  | 422.15µs | 422.15µs | 1 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.837ms |  |  | 3.837ms | 3.837ms | 1 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 15.188ms |  |  | 15.188ms | 15.188ms | 1 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs |  |  | 0.11µs | 0.11µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs |  |  | 0.18µs | 0.18µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.08µs |  |  | 1.08µs | 1.08µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs |  |  | 0.33µs | 0.33µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.67µs |  |  | 1.67µs | 1.67µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.71µs |  |  | 14.71µs | 14.71µs | 1 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 548.36µs |  |  | 548.36µs | 548.36µs | 1 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.054ms |  |  | 1.054ms | 1.054ms | 1 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.376ms |  |  | 4.376ms | 4.376ms | 1 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.923ms |  |  | 1.923ms | 1.923ms | 1 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.144ms |  |  | 12.144ms | 12.144ms | 1 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 183.408ms |  |  | 183.408ms | 183.408ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 298.60µs |  |  | 298.60µs | 298.60µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.592ms |  |  | 1.592ms | 1.592ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 42.270ms |  |  | 42.270ms | 42.270ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.582ms |  |  | 1.582ms | 1.582ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.566ms |  |  | 1.566ms | 1.566ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.513ms |  |  | 1.513ms | 1.513ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.412ms |  |  | 1.412ms | 1.412ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 891.43µs |  |  | 891.43µs | 891.43µs | 1 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.428ms |  |  | 1.428ms | 1.428ms | 1 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.435ms |  |  | 1.435ms | 1.435ms | 1 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 186.93µs |  |  | 186.93µs | 186.93µs | 1 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.93µs |  |  | 61.93µs | 61.93µs | 1 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 756.03µs |  |  | 756.03µs | 756.03µs | 1 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 911.35µs |  |  | 911.35µs | 911.35µs | 1 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.017ms |  |  | 1.017ms | 1.017ms | 1 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 73.00µs |  |  | 73.00µs | 73.00µs | 1 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 670.77µs |  |  | 670.77µs | 670.77µs | 1 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 70.29µs |  |  | 70.29µs | 70.29µs | 1 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 643.21µs |  |  | 643.21µs | 643.21µs | 1 |

informational; points come from different runners of the same class, so read trends, not single deltas.
