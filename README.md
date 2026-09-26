## aui-perf nightly record

_24 points · 2026-09-03T05:27:14.273Z to 2026-09-26T04:34:23.807Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 612.35µs | -0.4% |  | 592.10µs | 671.22µs | 15 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 688.62µs | -1.0% |  | 665.78µs | 760.33µs | 15 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.22µs | +1.2% |  | 32.52µs | 42.08µs | 24 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 372.06µs | +1.5% |  | 359.60µs | 471.76µs | 24 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.632ms | -0.9% |  | 5.607ms | 7.384ms | 24 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 153.85µs | -2.0% |  | 152.78µs | 208.89µs | 24 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.375ms | -2.4% |  | 1.375ms | 1.897ms | 24 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.570ms | -1.1% |  | 5.570ms | 7.535ms | 24 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.82µs | +0.2% |  | 6.47µs | 7.65µs | 24 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 54.32µs | -3.6% |  | 52.55µs | 59.72µs | 24 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 205.04µs | +1.7% |  | 201.64µs | 243.56µs | 24 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 510.29µs | +0.1% |  | 487.10µs | 654.19µs | 24 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.486ms | -2.0% |  | 4.434ms | 6.076ms | 24 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.736ms | -0.6% |  | 17.461ms | 24.024ms | 24 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 299.51µs | +1.7% |  | 291.94µs | 495.40µs | 24 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.782ms | +1.3% |  | 2.715ms | 4.316ms | 24 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 10.941ms | +1.3% |  | 10.803ms | 17.276ms | 24 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 26.48µs | +2.7% |  | 23.84µs | 27.41µs | 15 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 262.47µs | +0.6% |  | 249.56µs | 293.53µs | 15 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.416ms | +1.1% |  | 1.384ms | 1.564ms | 15 |
| external-message-conversion › core: external message tool results › 100 matches | 39.19µs | +18.8% |  | 27.25µs | 39.19µs | 15 |
| external-message-conversion › core: external message tool results › 1000 matches | 393.69µs | +18.8% |  | 274.56µs | 393.69µs | 15 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.168ms | +18.5% |  | 1.515ms | 2.168ms | 15 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 23.30µs | +3.8% |  | 17.93µs | 23.30µs | 15 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 225.03µs | +4.7% |  | 174.51µs | 225.03µs | 15 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.294ms | +5.4% |  | 975.63µs | 1.294ms | 15 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +3.4% |  | 0.10µs | 0.12µs | 24 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +5.7% |  | 0.17µs | 0.21µs | 24 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.11µs | +11.8% |  | 0.99µs | 1.21µs | 24 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs | +3.3% |  | 0.30µs | 0.38µs | 24 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.01µs | +4.7% |  | 1.58µs | 2.01µs | 24 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 18.35µs | +3.3% |  | 14.02µs | 18.35µs | 24 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 78.33µs | +3.6% |  | 70.58µs | 86.70µs | 16 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 496.58µs | -1.3% |  | 452.51µs | 596.48µs | 16 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 642.04µs | +19.7% |  | 371.23µs | 712.00µs | 24 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.142ms | -6.6% |  | 1.035ms | 1.222ms | 24 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.430ms | +4.0% |  | 4.007ms | 5.103ms | 24 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.119ms | -0.0% |  | 1.097ms | 1.166ms | 23 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.087ms | -2.8% |  | 1.049ms | 1.142ms | 23 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.210ms | -10.4% |  | 2.210ms | 3.478ms | 23 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.11µs | -0.4% |  | 2.52µs | 3.12µs | 14 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.28µs | -1.0% |  | 10.92µs | 12.54µs | 14 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.19µs | -0.8% |  | 24.38µs | 30.43µs | 14 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 284.51µs | -0.5% |  | 206.12µs | 286.06µs | 14 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.015ms | +19.9% |  | 1.549ms | 2.309ms | 24 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.240ms | -2.9% |  | 11.058ms | 15.221ms | 24 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 159.336ms | +4.0% |  | 150.737ms | 230.357ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 218.65µs | -42.2% |  | 168.27µs | 378.51µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 616.70µs | -65.3% |  | 525.36µs | 1.812ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.045ms | -80.1% |  | 5.537ms | 54.890ms | 24 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 184.14µs | +1.0% |  | 178.72µs | 219.89µs | 17 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.544ms | -1.0% |  | 1.531ms | 1.885ms | 17 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 812.26µs | +0.8% |  | 782.04µs | 964.22µs | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.653ms | -3.2% |  | 1.582ms | 2.102ms | 24 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.726ms | +6.5% |  | 1.558ms | 2.023ms | 24 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.651ms | -0.9% |  | 1.497ms | 1.970ms | 24 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.432ms | -0.3% |  | 1.394ms | 1.703ms | 24 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.028ms | +6.2% |  | 876.38µs | 1.091ms | 24 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.546ms | +7.9% |  | 1.387ms | 1.756ms | 24 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.510ms | +5.6% |  | 1.384ms | 1.612ms | 24 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 189.93µs | -5.9% |  | 173.75µs | 201.76µs | 24 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.25µs | +3.1% |  | 60.09µs | 71.53µs | 24 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 820.12µs | +11.7% |  | 727.85µs | 928.53µs | 24 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 772.15µs | -2.9% |  | 689.02µs | 1.060ms | 24 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 815.76µs | +1.4% |  | 693.05µs | 1.242ms | 24 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.06µs | +4.2% |  | 35.25µs | 89.26µs | 24 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 680.51µs | +5.0% |  | 589.02µs | 765.54µs | 24 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.64µs | -1.1% |  | 32.95µs | 80.26µs | 24 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 638.66µs | +1.2% |  | 586.81µs | 738.13µs | 24 |

informational; points come from different runners of the same class, so read trends, not single deltas.
