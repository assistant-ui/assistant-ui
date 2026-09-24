## aui-perf nightly record

_22 points · 2026-09-03T05:27:14.273Z to 2026-09-24T04:42:21.539Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 596.36µs | -2.7% |  | 592.10µs | 671.22µs | 13 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 674.90µs | -1.3% |  | 665.78µs | 760.33µs | 13 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.42µs | -1.8% |  | 32.52µs | 42.08µs | 22 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 380.53µs | -3.4% |  | 359.60µs | 471.76µs | 22 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.866ms | -0.3% |  | 5.607ms | 7.384ms | 22 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.47µs | -0.0% |  | 152.78µs | 208.89µs | 22 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.452ms | -0.2% |  | 1.409ms | 1.897ms | 22 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.794ms | +0.3% |  | 5.633ms | 7.535ms | 22 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.58µs | -1.8% |  | 6.47µs | 7.65µs | 22 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 52.94µs | -1.9% |  | 52.55µs | 59.72µs | 22 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 208.96µs | -2.6% |  | 201.64µs | 243.56µs | 22 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 533.50µs | +1.0% |  | 487.10µs | 654.19µs | 22 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.859ms | +1.7% |  | 4.434ms | 6.076ms | 22 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.203ms | +1.2% |  | 17.461ms | 24.024ms | 22 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 336.23µs | +0.5% |  | 291.94µs | 495.40µs | 22 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.132ms | -1.2% |  | 2.715ms | 4.316ms | 22 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.426ms | -0.4% |  | 10.803ms | 17.276ms | 22 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.22µs | -0.1% |  | 23.84µs | 27.41µs | 13 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 262.01µs | -0.3% |  | 249.56µs | 293.53µs | 13 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.428ms | +0.3% |  | 1.384ms | 1.564ms | 13 |
| external-message-conversion › core: external message tool results › 100 matches | 33.02µs | +18.2% |  | 27.25µs | 36.03µs | 13 |
| external-message-conversion › core: external message tool results › 1000 matches | 345.04µs | +22.7% |  | 274.56µs | 361.61µs | 13 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.802ms | +18.2% |  | 1.515ms | 2.004ms | 13 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.88µs | +2.5% |  | 17.93µs | 22.45µs | 13 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 185.15µs | +3.2% |  | 174.51µs | 214.95µs | 13 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.043ms | +4.6% |  | 975.63µs | 1.228ms | 13 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | +2.1% |  | 0.10µs | 0.12µs | 22 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +7.8% |  | 0.17µs | 0.21µs | 22 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.15µs | +8.3% |  | 0.99µs | 1.21µs | 22 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | +5.8% |  | 0.30µs | 0.38µs | 22 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.76µs | +7.5% |  | 1.58µs | 1.97µs | 22 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.05µs | +8.9% |  | 14.02µs | 17.76µs | 22 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.15µs | -0.7% |  | 70.58µs | 86.70µs | 14 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 471.98µs | +2.2% |  | 452.51µs | 596.48µs | 14 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 371.23µs | -15.2% |  | 371.23µs | 712.00µs | 22 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.054ms | -3.1% |  | 1.035ms | 1.222ms | 22 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.007ms | -1.7% |  | 4.007ms | 5.103ms | 22 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.163ms | +2.0% |  | 1.097ms | 1.166ms | 21 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.054ms | -2.1% |  | 1.049ms | 1.142ms | 21 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.899ms | +0.6% |  | 2.356ms | 3.478ms | 21 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.57µs | -0.4% |  | 2.52µs | 3.12µs | 12 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.17µs | -3.9% |  | 10.92µs | 12.41µs | 12 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.89µs | -3.0% |  | 24.38µs | 30.43µs | 12 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 231.71µs | +0.3% |  | 206.12µs | 286.06µs | 12 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.662ms | -4.1% |  | 1.549ms | 2.309ms | 22 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.049ms | -5.9% |  | 11.058ms | 15.221ms | 22 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 178.554ms | +0.9% |  | 150.737ms | 230.357ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 174.68µs | -37.5% |  | 168.27µs | 378.51µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 534.28µs | -65.6% |  | 525.36µs | 1.812ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 5.537ms | -88.1% |  | 5.537ms | 54.890ms | 22 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 194.02µs | -1.2% |  | 178.72µs | 219.89µs | 15 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.675ms | +0.1% |  | 1.531ms | 1.885ms | 15 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 860.94µs | -0.3% |  | 782.04µs | 964.22µs | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.651ms | -2.1% |  | 1.582ms | 2.102ms | 22 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.584ms | -4.3% |  | 1.558ms | 2.023ms | 22 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.549ms | -4.6% |  | 1.497ms | 1.970ms | 22 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.456ms | +0.6% |  | 1.403ms | 1.703ms | 22 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 916.45µs | +0.7% |  | 876.38µs | 1.091ms | 22 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.408ms | -6.4% |  | 1.387ms | 1.756ms | 22 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.406ms | -4.4% |  | 1.384ms | 1.612ms | 22 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 180.01µs | -5.6% |  | 173.75µs | 201.76µs | 22 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.29µs | +0.7% |  | 60.09µs | 71.53µs | 22 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 740.75µs | -4.7% |  | 727.85µs | 928.53µs | 22 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 714.24µs | +0.4% |  | 689.02µs | 1.060ms | 22 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 706.37µs | +0.8% |  | 693.05µs | 1.242ms | 22 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.59µs | -0.6% |  | 35.25µs | 89.26µs | 22 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 615.03µs | -1.9% |  | 589.02µs | 765.54µs | 22 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.77µs | -1.3% |  | 32.95µs | 80.26µs | 22 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 599.35µs | -1.5% |  | 586.81µs | 738.13µs | 22 |

informational; points come from different runners of the same class, so read trends, not single deltas.
