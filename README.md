## aui-perf nightly record

_27 points · 2026-09-03T05:27:14.273Z to 2026-09-29T04:37:16.773Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 680.22µs | +14.3% |  | 592.10µs | 680.22µs | 18 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 749.67µs | +12.6% |  | 665.78µs | 760.33µs | 18 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 36.14µs | +11.1% |  | 32.52µs | 42.08µs | 27 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 405.94µs | +11.0% |  | 359.60µs | 471.76µs | 27 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.268ms | +9.5% |  | 5.607ms | 7.384ms | 27 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 171.14µs | +9.7% |  | 152.78µs | 208.89µs | 27 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.548ms | +9.4% |  | 1.375ms | 1.897ms | 27 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.287ms | +10.8% |  | 5.570ms | 7.535ms | 27 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.40µs | +13.6% |  | 6.47µs | 7.65µs | 27 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 59.57µs | +11.8% |  | 52.55µs | 59.72µs | 27 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 231.39µs | +9.8% |  | 201.64µs | 243.56µs | 27 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 577.24µs | +12.4% |  | 487.10µs | 654.19µs | 27 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.251ms | +11.3% |  | 4.434ms | 6.076ms | 27 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.755ms | +10.9% |  | 17.461ms | 24.024ms | 27 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 365.30µs | +13.7% |  | 291.94µs | 495.40µs | 27 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.409ms | +12.2% |  | 2.715ms | 4.316ms | 27 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.315ms | +8.0% |  | 10.803ms | 17.276ms | 27 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 26.79µs | +10.0% |  | 23.84µs | 27.41µs | 18 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 292.92µs | +10.3% |  | 249.56µs | 293.53µs | 18 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.533ms | +7.6% |  | 1.384ms | 1.564ms | 18 |
| external-message-conversion › core: external message tool results › 100 matches | 36.73µs | +9.9% |  | 27.25µs | 39.19µs | 18 |
| external-message-conversion › core: external message tool results › 1000 matches | 374.14µs | +10.7% |  | 274.56µs | 393.69µs | 18 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.005ms | +7.7% |  | 1.515ms | 2.168ms | 18 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.77µs | +20.9% |  | 17.93µs | 23.30µs | 18 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 215.09µs | +23.3% |  | 174.51µs | 225.03µs | 18 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.175ms | +19.5% |  | 975.63µs | 1.294ms | 18 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +13.1% |  | 0.10µs | 0.12µs | 27 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +20.0% |  | 0.17µs | 0.21µs | 27 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.33µs | +28.3% |  | 0.99µs | 1.33µs | 27 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | +17.2% |  | 0.30µs | 0.38µs | 27 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.91µs | +17.0% |  | 1.58µs | 2.01µs | 27 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.55µs | +21.3% |  | 14.02µs | 18.35µs | 27 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 83.26µs | +18.0% |  | 70.58µs | 86.70µs | 19 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 527.19µs | +16.5% |  | 447.91µs | 596.48µs | 19 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 646.60µs | +69.4% |  | 371.23µs | 712.00µs | 27 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.160ms | +11.3% |  | 1.026ms | 1.222ms | 27 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.183ms | +29.2% |  | 4.007ms | 5.183ms | 27 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.180ms | +1.2% |  | 1.097ms | 1.180ms | 26 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.111ms | +5.6% |  | 1.044ms | 1.142ms | 26 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.733ms | -5.5% |  | 2.210ms | 3.478ms | 26 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.74µs | +7.7% |  | 2.52µs | 3.12µs | 17 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.96µs | +24.3% |  | 10.92µs | 13.96µs | 17 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.21µs | +6.7% |  | 24.38µs | 30.43µs | 17 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 268.50µs | +20.4% |  | 206.12µs | 286.06µs | 17 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.541ms | +57.4% |  | 1.549ms | 2.541ms | 27 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 16.358ms | +35.4% |  | 11.058ms | 16.358ms | 27 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 240.613ms | +37.9% |  | 150.737ms | 240.613ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 205.94µs | +22.4% |  | 168.27µs | 378.51µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 610.57µs | +16.2% |  | 525.36µs | 1.812ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 18.547ms | +227.8% |  | 5.537ms | 54.890ms | 27 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 221.60µs | +15.3% |  | 178.72µs | 221.60µs | 20 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.833ms | +10.8% |  | 1.531ms | 1.885ms | 20 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 945.67µs | +10.9% |  | 782.04µs | 964.22µs | 20 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.753ms | +7.2% |  | 1.582ms | 2.102ms | 27 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.804ms | +12.3% |  | 1.558ms | 2.023ms | 27 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.753ms | +14.6% |  | 1.497ms | 1.970ms | 27 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.547ms | +9.4% |  | 1.394ms | 1.703ms | 27 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.015ms | +15.1% |  | 876.38µs | 1.091ms | 27 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.608ms | +14.7% |  | 1.387ms | 1.756ms | 27 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.608ms | +13.7% |  | 1.384ms | 1.612ms | 27 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 210.75µs | +19.9% |  | 172.71µs | 210.75µs | 27 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 66.20µs | +9.9% |  | 60.09µs | 71.53µs | 27 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 857.20µs | +17.8% |  | 727.85µs | 928.53µs | 27 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 793.92µs | +10.8% |  | 689.02µs | 1.060ms | 27 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 809.34µs | +14.1% |  | 693.05µs | 1.242ms | 27 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 43.78µs | +24.2% |  | 35.25µs | 89.26µs | 27 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 666.90µs | +6.3% |  | 589.02µs | 765.54µs | 27 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 40.22µs | +20.0% |  | 32.95µs | 80.26µs | 27 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 700.79µs | +17.0% |  | 586.81µs | 738.13µs | 27 |

informational; points come from different runners of the same class, so read trends, not single deltas.
