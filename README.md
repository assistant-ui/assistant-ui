## aui-perf nightly record

_28 points · 2026-09-03T05:27:14.273Z to 2026-09-30T04:38:08.302Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 632.77µs | -0.2% |  | 592.10µs | 680.22µs | 19 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 714.44µs | -1.7% |  | 665.78µs | 760.33µs | 19 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.43µs | -8.4% |  | 32.52µs | 42.08µs | 28 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 372.81µs | -8.5% |  | 359.60µs | 471.76µs | 28 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.850ms | -7.2% |  | 5.607ms | 7.384ms | 28 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 155.40µs | -8.1% |  | 152.78µs | 208.89µs | 28 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.464ms | -6.8% |  | 1.375ms | 1.897ms | 28 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.761ms | -8.4% |  | 5.570ms | 7.535ms | 28 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.73µs | -6.4% |  | 6.47µs | 7.65µs | 28 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 56.03µs | +0.4% |  | 52.55µs | 59.72µs | 28 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 220.31µs | -0.8% |  | 201.64µs | 243.56µs | 28 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 539.79µs | -4.6% |  | 487.10µs | 654.19µs | 28 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.898ms | -4.4% |  | 4.434ms | 6.076ms | 28 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.308ms | -4.9% |  | 17.461ms | 24.024ms | 28 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 331.76µs | -6.7% |  | 291.94µs | 495.40µs | 28 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.074ms | -10.9% |  | 2.715ms | 4.316ms | 28 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.345ms | -10.8% |  | 10.803ms | 17.276ms | 28 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 25.39µs | -2.6% |  | 23.84µs | 27.41µs | 19 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 274.52µs | -3.1% |  | 249.56µs | 293.53µs | 19 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.488ms | -0.5% |  | 1.384ms | 1.564ms | 19 |
| external-message-conversion › core: external message tool results › 100 matches | 34.27µs | -0.2% |  | 27.25µs | 39.19µs | 19 |
| external-message-conversion › core: external message tool results › 1000 matches | 351.55µs | +1.4% |  | 274.56µs | 393.69µs | 19 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.924ms | +1.2% |  | 1.515ms | 2.168ms | 19 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.28µs | +1.9% |  | 17.93µs | 23.30µs | 19 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 202.72µs | +4.0% |  | 174.51µs | 225.03µs | 19 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.097ms | -0.1% |  | 975.63µs | 1.294ms | 19 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -6.3% |  | 0.10µs | 0.12µs | 28 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | -0.7% |  | 0.17µs | 0.21µs | 28 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.18µs | +1.7% |  | 0.99µs | 1.33µs | 28 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -5.2% |  | 0.30µs | 0.38µs | 28 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.74µs | -1.1% |  | 1.58µs | 2.01µs | 28 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.68µs | +4.8% |  | 14.02µs | 18.35µs | 28 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.39µs | -2.1% |  | 70.58µs | 86.70µs | 20 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 457.25µs | -9.3% |  | 447.91µs | 596.48µs | 20 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 554.40µs | +35.9% |  | 371.23µs | 712.00µs | 28 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.069ms | -6.6% |  | 1.026ms | 1.222ms | 28 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.432ms | +3.0% |  | 4.007ms | 5.183ms | 28 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.115ms | -2.7% |  | 1.097ms | 1.180ms | 27 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.064ms | -3.8% |  | 1.044ms | 1.142ms | 27 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.683ms | -4.6% |  | 2.210ms | 3.478ms | 27 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.53µs | -8.5% |  | 2.52µs | 3.12µs | 18 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.10µs | +0.2% |  | 10.92µs | 13.96µs | 18 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.46µs | -8.1% |  | 24.38µs | 30.43µs | 18 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 225.75µs | -5.8% |  | 206.12µs | 286.06µs | 18 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.032ms | +10.8% |  | 1.549ms | 2.541ms | 28 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.063ms | -6.3% |  | 11.058ms | 16.358ms | 28 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 187.492ms | -11.6% |  | 150.737ms | 240.613ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 192.64µs | +2.3% |  | 168.27µs | 378.51µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 528.64µs | -14.1% |  | 525.36µs | 1.812ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.700ms | +13.3% |  | 5.537ms | 54.890ms | 28 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 198.59µs | -5.5% |  | 178.72µs | 221.60µs | 21 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.658ms | -7.8% |  | 1.531ms | 1.885ms | 21 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 858.05µs | -7.6% |  | 782.04µs | 964.22µs | 21 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.650ms | -7.1% |  | 1.582ms | 2.102ms | 28 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.687ms | -9.8% |  | 1.558ms | 2.023ms | 28 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.590ms | -9.4% |  | 1.497ms | 1.970ms | 28 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.452ms | -5.2% |  | 1.394ms | 1.703ms | 28 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 957.12µs | -4.0% |  | 876.38µs | 1.091ms | 28 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.518ms | -1.2% |  | 1.387ms | 1.756ms | 28 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.454ms | -5.8% |  | 1.384ms | 1.612ms | 28 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 181.01µs | -5.6% |  | 172.71µs | 210.75µs | 28 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.68µs | -5.6% |  | 60.09µs | 71.53µs | 28 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 803.10µs | -0.6% |  | 727.85µs | 928.53µs | 28 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 713.39µs | -6.7% |  | 689.02µs | 1.060ms | 28 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 719.58µs | -5.2% |  | 693.05µs | 1.242ms | 28 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.56µs | -5.3% |  | 35.25µs | 89.26µs | 28 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 597.21µs | -11.1% |  | 589.02µs | 765.54µs | 28 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.30µs | -3.6% |  | 32.95µs | 80.26µs | 28 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 609.98µs | -5.7% |  | 586.81µs | 738.13µs | 28 |

informational; points come from different runners of the same class, so read trends, not single deltas.
