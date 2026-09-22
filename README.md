## aui-perf nightly record

_20 points · 2026-09-03T05:27:14.273Z to 2026-09-22T04:38:56.877Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 634.03µs | +5.8% |  | 592.10µs | 644.55µs | 11 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 726.78µs | +8.7% |  | 665.78µs | 727.09µs | 11 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 36.47µs | +10.4% |  | 32.52µs | 42.08µs | 20 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 407.55µs | +9.1% |  | 359.60µs | 471.76µs | 20 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.307ms | +7.8% |  | 5.607ms | 7.384ms | 20 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 169.03µs | +6.5% |  | 152.78µs | 208.89µs | 20 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.570ms | +6.7% |  | 1.409ms | 1.897ms | 20 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.290ms | +6.9% |  | 5.633ms | 7.535ms | 20 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.19µs | +7.3% |  | 6.47µs | 7.65µs | 20 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.78µs | +4.3% |  | 52.55µs | 59.72µs | 20 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 222.09µs | +5.1% |  | 201.64µs | 235.90µs | 20 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 565.91µs | +14.3% |  | 487.10µs | 654.19µs | 20 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.125ms | +13.3% |  | 4.434ms | 6.076ms | 20 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.310ms | +13.2% |  | 17.461ms | 24.024ms | 20 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 355.70µs | +8.0% |  | 291.94µs | 495.40µs | 20 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.449ms | +11.6% |  | 2.715ms | 4.316ms | 20 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.843ms | +10.1% |  | 10.803ms | 17.276ms | 20 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 26.05µs | +6.9% |  | 23.84µs | 27.35µs | 11 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 283.16µs | +5.7% |  | 249.56µs | 291.82µs | 11 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.495ms | +8.0% |  | 1.384ms | 1.564ms | 11 |
| external-message-conversion › core: external message tool results › 100 matches | 34.35µs | +22.2% |  | 27.25µs | 34.35µs | 11 |
| external-message-conversion › core: external message tool results › 1000 matches | 346.62µs | +21.1% |  | 274.56µs | 346.62µs | 11 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.901ms | +25.5% |  | 1.515ms | 1.901ms | 11 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.91µs | +6.9% |  | 17.93µs | 22.45µs | 11 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 194.93µs | +7.7% |  | 174.51µs | 214.95µs | 11 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.099ms | +9.2% |  | 975.63µs | 1.228ms | 11 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +6.7% |  | 0.10µs | 0.12µs | 20 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +8.8% |  | 0.17µs | 0.21µs | 20 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.16µs | +6.9% |  | 0.99µs | 1.21µs | 20 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | +9.1% |  | 0.30µs | 0.38µs | 20 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.76µs | +8.2% |  | 1.58µs | 1.97µs | 20 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.97µs | +4.4% |  | 14.02µs | 17.76µs | 20 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 74.93µs | +3.7% |  | 70.58µs | 78.05µs | 12 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 504.36µs | +6.2% |  | 452.51µs | 520.29µs | 12 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 407.95µs | -1.0% |  | 381.70µs | 712.00µs | 20 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.145ms | +4.2% |  | 1.035ms | 1.222ms | 20 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.303ms | +5.2% |  | 4.011ms | 5.103ms | 20 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.146ms | -0.9% |  | 1.097ms | 1.166ms | 19 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.106ms | +3.7% |  | 1.049ms | 1.142ms | 19 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.811ms | +9.0% |  | 2.356ms | 3.478ms | 19 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.76µs | +7.0% |  | 2.52µs | 3.12µs | 10 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.08µs | -8.7% |  | 10.92µs | 12.41µs | 10 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.62µs | +7.1% |  | 24.38µs | 30.43µs | 10 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 239.68µs | +10.9% |  | 206.12µs | 286.06µs | 10 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.833ms | +5.5% |  | 1.549ms | 2.309ms | 20 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.942ms | +6.8% |  | 11.058ms | 14.062ms | 20 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 212.162ms | +15.0% |  | 150.737ms | 219.705ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 188.33µs | -35.3% |  | 168.27µs | 378.51µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 615.29µs | -65.2% |  | 525.36µs | 1.812ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.798ms | -85.3% |  | 5.657ms | 54.890ms | 20 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 210.23µs | +5.5% |  | 178.72µs | 210.23µs | 13 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.799ms | +5.1% |  | 1.531ms | 1.799ms | 13 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 928.75µs | +6.2% |  | 782.04µs | 928.75µs | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.775ms | +10.3% |  | 1.582ms | 2.011ms | 20 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.870ms | +18.0% |  | 1.558ms | 2.017ms | 20 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.754ms | +13.0% |  | 1.497ms | 1.928ms | 20 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.532ms | +4.7% |  | 1.403ms | 1.703ms | 20 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 996.89µs | +13.8% |  | 876.38µs | 1.056ms | 20 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.537ms | +8.9% |  | 1.387ms | 1.756ms | 20 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.544ms | +10.0% |  | 1.384ms | 1.612ms | 20 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 191.66µs | +1.4% |  | 173.75µs | 201.76µs | 20 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 65.34µs | +7.4% |  | 60.09µs | 71.53µs | 20 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 807.82µs | +8.7% |  | 727.85µs | 928.53µs | 20 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 764.84µs | +11.0% |  | 689.02µs | 1.060ms | 20 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 759.24µs | +9.4% |  | 693.05µs | 1.242ms | 20 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.62µs | +5.7% |  | 35.25µs | 89.26µs | 20 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 671.91µs | +9.2% |  | 589.02µs | 765.54µs | 20 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.57µs | -0.3% |  | 32.95µs | 80.26µs | 20 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 646.93µs | +8.5% |  | 586.81µs | 738.13µs | 20 |

informational; points come from different runners of the same class, so read trends, not single deltas.
