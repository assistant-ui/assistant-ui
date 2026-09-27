## aui-perf nightly record

_25 points · 2026-09-03T05:27:14.273Z to 2026-09-27T04:35:41.380Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 607.98µs | -4.7% |  | 592.10µs | 671.22µs | 16 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 679.20µs | -3.3% |  | 665.78µs | 760.33µs | 16 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.82µs | +3.6% |  | 32.52µs | 42.08µs | 25 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 378.59µs | +5.3% |  | 359.60µs | 471.76µs | 25 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.835ms | +4.1% |  | 5.607ms | 7.384ms | 25 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.02µs | +2.8% |  | 152.78µs | 208.89µs | 25 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.440ms | +1.0% |  | 1.375ms | 1.897ms | 25 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.721ms | -0.4% |  | 5.570ms | 7.535ms | 25 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.62µs | -1.9% |  | 6.47µs | 7.65µs | 25 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.68µs | +0.8% |  | 52.55µs | 59.72µs | 25 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 211.11µs | +2.2% |  | 201.64µs | 243.56µs | 25 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 517.34µs | +3.4% |  | 487.10µs | 654.19µs | 25 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.690ms | +4.3% |  | 4.434ms | 6.076ms | 25 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.552ms | +4.5% |  | 17.461ms | 24.024ms | 25 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 333.37µs | +14.2% |  | 291.94µs | 495.40µs | 25 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.210ms | +18.2% |  | 2.715ms | 4.316ms | 25 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.419ms | +14.8% |  | 10.803ms | 17.276ms | 25 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.16µs | -2.9% |  | 23.84µs | 27.41µs | 16 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 261.66µs | +4.8% |  | 249.56µs | 293.53µs | 16 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.404ms | +1.3% |  | 1.384ms | 1.564ms | 16 |
| external-message-conversion › core: external message tool results › 100 matches | 32.57µs | +0.9% |  | 27.25µs | 39.19µs | 16 |
| external-message-conversion › core: external message tool results › 1000 matches | 335.19µs | +3.4% |  | 274.56µs | 393.69µs | 16 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.814ms | +1.0% |  | 1.515ms | 2.168ms | 16 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.43µs | -11.0% |  | 17.93µs | 23.30µs | 16 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 191.91µs | -8.2% |  | 174.51µs | 225.03µs | 16 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.046ms | -12.4% |  | 975.63µs | 1.294ms | 16 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -1.0% |  | 0.10µs | 0.12µs | 25 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +10.4% |  | 0.17µs | 0.21µs | 25 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.17µs | +18.8% |  | 0.99µs | 1.21µs | 25 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | +9.0% |  | 0.30µs | 0.38µs | 25 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.71µs | -9.4% |  | 1.58µs | 2.01µs | 25 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.32µs | -10.5% |  | 14.02µs | 18.35µs | 25 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.16µs | -0.4% |  | 70.58µs | 86.70µs | 17 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 451.14µs | -13.3% |  | 451.14µs | 596.48µs | 17 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 533.50µs | -0.9% |  | 371.23µs | 712.00µs | 25 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.064ms | -12.1% |  | 1.035ms | 1.222ms | 25 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.394ms | +4.3% |  | 4.007ms | 5.103ms | 25 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.134ms | +2.1% |  | 1.097ms | 1.166ms | 24 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.044ms | -7.6% |  | 1.044ms | 1.142ms | 24 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.750ms | +16.7% |  | 2.210ms | 3.478ms | 24 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.54µs | -17.6% |  | 2.52µs | 3.12µs | 15 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.32µs | -8.8% |  | 10.92µs | 12.54µs | 15 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.48µs | -19.5% |  | 24.38µs | 30.43µs | 15 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 232.68µs | -18.7% |  | 206.12µs | 286.06µs | 15 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.829ms | +9.2% |  | 1.549ms | 2.309ms | 25 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.197ms | -1.4% |  | 11.058ms | 15.221ms | 25 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 183.751ms | +21.9% |  | 150.737ms | 230.357ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 189.04µs | -49.1% |  | 168.27µs | 378.51µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 537.71µs | -68.5% |  | 525.36µs | 1.812ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.181ms | -82.5% |  | 5.537ms | 54.890ms | 25 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 194.93µs | +9.1% |  | 178.72µs | 219.89µs | 18 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.640ms | +7.1% |  | 1.531ms | 1.885ms | 18 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 850.30µs | +8.7% |  | 782.04µs | 964.22µs | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.617ms | -4.4% |  | 1.582ms | 2.102ms | 25 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.659ms | +1.6% |  | 1.558ms | 2.023ms | 25 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.620ms | +2.2% |  | 1.497ms | 1.970ms | 25 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.401ms | -1.4% |  | 1.394ms | 1.703ms | 25 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 931.52µs | -2.3% |  | 876.38µs | 1.091ms | 25 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.480ms | +2.3% |  | 1.387ms | 1.756ms | 25 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.492ms | +2.5% |  | 1.384ms | 1.612ms | 25 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 178.94µs | -8.5% |  | 173.75µs | 201.76µs | 25 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.78µs | -0.1% |  | 60.09µs | 71.53µs | 25 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 784.53µs | +5.3% |  | 727.85µs | 928.53µs | 25 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 708.46µs | -9.4% |  | 689.02µs | 1.060ms | 25 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 735.40µs | -8.7% |  | 693.05µs | 1.242ms | 25 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.04µs | -2.7% |  | 35.25µs | 89.26µs | 25 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 626.08µs | -5.3% |  | 589.02µs | 765.54µs | 25 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.19µs | -1.8% |  | 32.95µs | 80.26µs | 25 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 644.41µs | +4.2% |  | 586.81µs | 738.13µs | 25 |

informational; points come from different runners of the same class, so read trends, not single deltas.
