## aui-perf nightly record

_29 points · 2026-09-03T05:27:14.273Z to 2026-10-01T04:38:08.402Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 645.06µs | -3.9% |  | 592.10µs | 680.22µs | 20 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 718.03µs | -5.6% |  | 665.78µs | 760.33µs | 20 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.31µs | -10.5% |  | 32.52µs | 42.08µs | 29 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 395.48µs | -8.2% |  | 359.60µs | 471.76µs | 29 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.169ms | -9.2% |  | 5.607ms | 7.384ms | 29 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 161.14µs | -11.7% |  | 152.78µs | 208.89µs | 29 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.482ms | -12.8% |  | 1.375ms | 1.897ms | 29 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.063ms | -9.8% |  | 5.570ms | 7.535ms | 29 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.80µs | -9.2% |  | 6.47µs | 7.65µs | 29 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 57.67µs | -3.4% |  | 52.55µs | 59.72µs | 29 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 225.69µs | -7.3% |  | 201.64µs | 243.56µs | 29 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 550.08µs | -7.4% |  | 487.10µs | 654.19µs | 29 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.946ms | -8.1% |  | 4.434ms | 6.076ms | 29 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.873ms | -6.7% |  | 17.461ms | 24.024ms | 29 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 345.58µs | -9.9% |  | 291.94µs | 495.40µs | 29 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.225ms | -13.5% |  | 2.715ms | 4.316ms | 29 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.898ms | -12.8% |  | 10.803ms | 17.276ms | 29 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.78µs | -9.6% |  | 23.84µs | 27.41µs | 20 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 263.90µs | -10.1% |  | 249.56µs | 293.53µs | 20 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.433ms | -7.2% |  | 1.384ms | 1.564ms | 20 |
| external-message-conversion › core: external message tool results › 100 matches | 33.00µs | -8.4% |  | 27.25µs | 39.19µs | 20 |
| external-message-conversion › core: external message tool results › 1000 matches | 338.48µs | -6.4% |  | 274.56µs | 393.69µs | 20 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.825ms | -9.0% |  | 1.515ms | 2.168ms | 20 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.62µs | -3.8% |  | 17.93µs | 23.30µs | 20 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 203.04µs | -1.1% |  | 174.51µs | 225.03µs | 20 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.136ms | -2.0% |  | 975.63µs | 1.294ms | 20 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -7.5% |  | 0.10µs | 0.12µs | 29 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +0.3% |  | 0.17µs | 0.21µs | 29 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | +1.9% |  | 0.99µs | 1.33µs | 29 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | -4.9% |  | 0.30µs | 0.38µs | 29 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.71µs | -4.7% |  | 1.58µs | 2.01µs | 29 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.58µs | -1.1% |  | 14.02µs | 18.35µs | 29 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.59µs | -15.1% |  | 70.58µs | 86.70µs | 21 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 472.37µs | -20.8% |  | 447.91µs | 596.48µs | 21 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 533.68µs | +21.1% |  | 371.23µs | 712.00µs | 29 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.062ms | -11.2% |  | 1.026ms | 1.222ms | 29 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.219ms | -7.2% |  | 4.007ms | 5.183ms | 29 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.145ms | +2.6% |  | 1.097ms | 1.180ms | 28 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.073ms | -3.5% |  | 1.044ms | 1.142ms | 28 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.999ms | +1.3% |  | 2.210ms | 3.478ms | 28 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.59µs | -9.7% |  | 2.52µs | 3.12µs | 19 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.73µs | +4.7% |  | 10.92µs | 13.96µs | 19 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.15µs | -10.1% |  | 24.38µs | 30.43µs | 19 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 227.00µs | -9.8% |  | 206.12µs | 286.06µs | 19 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.964ms | -2.4% |  | 1.549ms | 2.541ms | 29 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.233ms | -19.6% |  | 11.058ms | 16.358ms | 29 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 194.776ms | -15.4% |  | 150.737ms | 240.613ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 194.51µs | -5.4% |  | 168.27µs | 378.51µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 544.37µs | -12.5% |  | 525.36µs | 1.812ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.200ms | -12.9% |  | 5.537ms | 54.890ms | 29 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 200.20µs | -9.0% |  | 178.72µs | 221.60µs | 22 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.680ms | -10.9% |  | 1.531ms | 1.885ms | 22 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 889.07µs | -7.8% |  | 782.04µs | 964.22µs | 22 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.470ms | -30.1% |  | 1.470ms | 2.102ms | 29 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.488ms | -26.5% |  | 1.488ms | 2.023ms | 29 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.414ms | -28.3% |  | 1.414ms | 1.970ms | 29 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.422ms | -13.9% |  | 1.394ms | 1.703ms | 29 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 904.60µs | -17.1% |  | 876.38µs | 1.091ms | 29 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.368ms | -17.7% |  | 1.368ms | 1.756ms | 29 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.330ms | -17.3% |  | 1.330ms | 1.612ms | 29 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 129.94µs | -33.8% |  | 129.94µs | 210.75µs | 29 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.19µs | -11.5% |  | 60.09µs | 71.53µs | 29 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 716.71µs | -14.3% |  | 716.71µs | 928.53µs | 29 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 724.92µs | -13.1% |  | 689.02µs | 1.060ms | 29 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 734.63µs | -10.7% |  | 693.05µs | 1.242ms | 29 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.23µs | -7.6% |  | 35.23µs | 89.26µs | 29 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 633.82µs | -4.4% |  | 589.02µs | 765.54µs | 29 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.33µs | -12.0% |  | 32.33µs | 80.26µs | 29 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 624.24µs | -9.0% |  | 586.81µs | 738.13µs | 29 |

informational; points come from different runners of the same class, so read trends, not single deltas.
