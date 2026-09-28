## aui-perf nightly record

_26 points · 2026-09-03T05:27:14.273Z to 2026-09-28T04:39:28.510Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 603.67µs | +0.4% |  | 592.10µs | 671.22µs | 17 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 682.53µs | -2.3% |  | 665.78µs | 760.33µs | 17 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.65µs | +2.2% |  | 32.52µs | 42.08µs | 26 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 370.93µs | -0.1% |  | 359.60µs | 471.76µs | 26 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.858ms | +1.2% |  | 5.607ms | 7.384ms | 26 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 155.12µs | +0.4% |  | 152.78µs | 208.89µs | 26 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.431ms | +0.1% |  | 1.375ms | 1.897ms | 26 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.733ms | +1.0% |  | 5.570ms | 7.535ms | 26 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.52µs | -1.0% |  | 6.47µs | 7.65µs | 26 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.12µs | -0.5% |  | 52.55µs | 59.72µs | 26 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 209.63µs | -0.4% |  | 201.64µs | 243.56µs | 26 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 516.48µs | -0.1% |  | 487.10µs | 654.19µs | 26 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.680ms | -0.1% |  | 4.434ms | 6.076ms | 26 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.637ms | -0.4% |  | 17.461ms | 24.024ms | 26 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 333.73µs | +6.6% |  | 291.94µs | 495.40µs | 26 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.099ms | +4.8% |  | 2.715ms | 4.316ms | 26 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.462ms | +3.8% |  | 10.803ms | 17.276ms | 26 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.23µs | +0.7% |  | 23.84µs | 27.41µs | 17 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 258.99µs | -0.4% |  | 249.56µs | 293.53µs | 17 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.416ms | +1.2% |  | 1.384ms | 1.564ms | 17 |
| external-message-conversion › core: external message tool results › 100 matches | 32.69µs | +18.3% |  | 27.25µs | 39.19µs | 17 |
| external-message-conversion › core: external message tool results › 1000 matches | 330.50µs | +16.4% |  | 274.56µs | 393.69µs | 17 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.811ms | +17.2% |  | 1.515ms | 2.168ms | 17 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.34µs | +4.2% |  | 17.93µs | 23.30µs | 17 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 192.59µs | +7.4% |  | 174.51µs | 225.03µs | 17 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.055ms | +6.4% |  | 975.63µs | 1.294ms | 17 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +7.3% |  | 0.10µs | 0.12µs | 26 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +16.5% |  | 0.17µs | 0.21µs | 26 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | +14.5% |  | 0.99µs | 1.21µs | 26 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +7.3% |  | 0.30µs | 0.38µs | 26 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.74µs | +9.9% |  | 1.58µs | 2.01µs | 26 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.50µs | +10.6% |  | 14.02µs | 18.35µs | 26 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.36µs | +3.6% |  | 70.58µs | 86.70µs | 18 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 447.91µs | -5.1% |  | 447.91µs | 596.48µs | 18 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 503.73µs | +25.2% |  | 371.23µs | 712.00µs | 26 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.026ms | -3.0% |  | 1.026ms | 1.222ms | 26 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.201ms | +4.3% |  | 4.007ms | 5.103ms | 26 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.122ms | -1.1% |  | 1.097ms | 1.166ms | 25 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.054ms | -0.2% |  | 1.044ms | 1.142ms | 25 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.831ms | -3.5% |  | 2.210ms | 3.478ms | 25 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.66µs | +5.4% |  | 2.52µs | 3.12µs | 16 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.66µs | +4.3% |  | 10.92µs | 12.54µs | 16 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.84µs | +6.0% |  | 24.38µs | 30.43µs | 16 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 232.63µs | +4.2% |  | 206.12µs | 286.06µs | 16 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.883ms | +21.4% |  | 1.549ms | 2.309ms | 26 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.705ms | -3.3% |  | 11.058ms | 15.221ms | 26 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 180.649ms | +3.8% |  | 150.737ms | 230.357ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 195.54µs | -34.2% |  | 168.27µs | 378.51µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 528.55µs | -67.1% |  | 525.36µs | 1.812ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.502ms | -85.9% |  | 5.537ms | 54.890ms | 26 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 196.80µs | +1.6% |  | 178.72µs | 219.89µs | 19 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.638ms | -0.6% |  | 1.531ms | 1.885ms | 19 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 855.70µs | +0.3% |  | 782.04µs | 964.22µs | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.624ms | -3.7% |  | 1.582ms | 2.102ms | 26 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.572ms | -5.6% |  | 1.558ms | 2.023ms | 26 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.610ms | -0.4% |  | 1.497ms | 1.970ms | 26 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.414ms | +0.5% |  | 1.394ms | 1.703ms | 26 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 914.31µs | +1.1% |  | 876.38µs | 1.091ms | 26 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.423ms | -4.7% |  | 1.387ms | 1.756ms | 26 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.404ms | -3.5% |  | 1.384ms | 1.612ms | 26 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 172.71µs | -6.7% |  | 172.71µs | 201.76µs | 26 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.82µs | +2.9% |  | 60.09µs | 71.53µs | 26 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 737.47µs | -6.8% |  | 727.85µs | 928.53µs | 26 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 711.79µs | +0.4% |  | 689.02µs | 1.060ms | 26 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 715.74µs | +2.5% |  | 693.05µs | 1.242ms | 26 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 37.35µs | +5.4% |  | 35.25µs | 89.26µs | 26 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 621.09µs | -0.5% |  | 589.02µs | 765.54µs | 26 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.90µs | +3.5% |  | 32.95µs | 80.26µs | 26 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 646.62µs | +7.6% |  | 586.81µs | 738.13µs | 26 |

informational; points come from different runners of the same class, so read trends, not single deltas.
