## aui-perf nightly record

_23 points · 2026-09-03T05:27:14.273Z to 2026-09-25T04:36:11.413Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 609.03µs | -0.6% |  | 592.10µs | 671.22µs | 14 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 691.94µs | +1.2% |  | 665.78µs | 760.33µs | 14 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.21µs | +0.6% |  | 32.52µs | 42.08µs | 23 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 372.49µs | -5.4% |  | 359.60µs | 471.76µs | 23 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.865ms | -0.3% |  | 5.607ms | 7.384ms | 23 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 159.40µs | +1.2% |  | 152.78µs | 208.89µs | 23 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.468ms | +0.9% |  | 1.409ms | 1.897ms | 23 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.946ms | +2.9% |  | 5.633ms | 7.535ms | 23 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.66µs | -0.6% |  | 6.47µs | 7.65µs | 23 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.02µs | -1.8% |  | 52.55µs | 59.72µs | 23 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 210.48µs | -1.9% |  | 201.64µs | 243.56µs | 23 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 527.01µs | -0.3% |  | 487.10µs | 654.19µs | 23 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.736ms | -0.9% |  | 4.434ms | 6.076ms | 23 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.941ms | -0.2% |  | 17.461ms | 24.024ms | 23 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 335.47µs | +0.2% |  | 291.94µs | 495.40µs | 23 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.071ms | -3.1% |  | 2.715ms | 4.316ms | 23 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.329ms | -1.1% |  | 10.803ms | 17.276ms | 23 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 25.04µs | +3.2% |  | 23.84µs | 27.41µs | 14 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 278.48µs | +6.0% |  | 249.56µs | 293.53µs | 14 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.469ms | +3.2% |  | 1.384ms | 1.564ms | 14 |
| external-message-conversion › core: external message tool results › 100 matches | 32.87µs | +17.7% |  | 27.25µs | 36.03µs | 14 |
| external-message-conversion › core: external message tool results › 1000 matches | 338.10µs | +20.2% |  | 274.56µs | 361.61µs | 14 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.805ms | +18.4% |  | 1.515ms | 2.004ms | 14 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.59µs | +6.4% |  | 17.93µs | 22.45µs | 14 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 190.71µs | +6.3% |  | 174.51µs | 214.95µs | 14 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.043ms | +4.6% |  | 975.63µs | 1.228ms | 14 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +4.9% |  | 0.10µs | 0.12µs | 23 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +8.1% |  | 0.17µs | 0.21µs | 23 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | +13.4% |  | 0.99µs | 1.21µs | 23 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | +5.4% |  | 0.30µs | 0.38µs | 23 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.71µs | +4.7% |  | 1.58µs | 1.97µs | 23 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.27µs | +3.6% |  | 14.02µs | 17.76µs | 23 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 77.01µs | +4.5% |  | 70.58µs | 86.70µs | 15 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 496.83µs | +7.6% |  | 452.51µs | 596.48µs | 15 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 553.40µs | +26.5% |  | 371.23µs | 712.00µs | 23 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.094ms | +0.7% |  | 1.035ms | 1.222ms | 23 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.569ms | +12.1% |  | 4.007ms | 5.103ms | 23 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.126ms | -1.2% |  | 1.097ms | 1.166ms | 22 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.062ms | -1.3% |  | 1.049ms | 1.142ms | 22 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.763ms | -4.1% |  | 2.356ms | 3.478ms | 22 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.60µs | +0.9% |  | 2.52µs | 3.12µs | 13 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.54µs | +7.9% |  | 10.92µs | 12.54µs | 13 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.78µs | +0.5% |  | 24.38µs | 30.43µs | 13 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 249.08µs | +7.9% |  | 206.12µs | 286.06µs | 13 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.026ms | +16.8% |  | 1.549ms | 2.309ms | 23 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.653ms | +6.7% |  | 11.058ms | 15.221ms | 23 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 197.117ms | +11.4% |  | 150.737ms | 230.357ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 199.06µs | -28.7% |  | 168.27µs | 378.51µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 545.46µs | -64.8% |  | 525.36µs | 1.812ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.773ms | -85.4% |  | 5.537ms | 54.890ms | 23 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 205.38µs | +4.6% |  | 178.72µs | 219.89µs | 16 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.721ms | +2.8% |  | 1.531ms | 1.885ms | 16 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 891.71µs | +3.2% |  | 782.04µs | 964.22µs | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.582ms | -6.2% |  | 1.582ms | 2.102ms | 23 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.639ms | -1.0% |  | 1.558ms | 2.023ms | 23 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.507ms | -7.2% |  | 1.497ms | 1.970ms | 23 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.394ms | -3.6% |  | 1.394ms | 1.703ms | 23 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 946.42µs | +4.0% |  | 876.38µs | 1.091ms | 23 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.463ms | -2.8% |  | 1.387ms | 1.756ms | 23 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.450ms | -1.4% |  | 1.384ms | 1.612ms | 23 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 192.32µs | +0.8% |  | 173.75µs | 201.76µs | 23 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.25µs | +3.9% |  | 60.09µs | 71.53µs | 23 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 764.85µs | -1.6% |  | 727.85µs | 928.53µs | 23 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 703.37µs | -1.2% |  | 689.02µs | 1.060ms | 23 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 711.15µs | +1.5% |  | 693.05µs | 1.242ms | 23 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.18µs | +6.6% |  | 35.25µs | 89.26µs | 23 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 596.89µs | -4.8% |  | 589.02µs | 765.54µs | 23 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.58µs | +9.8% |  | 32.95µs | 80.26µs | 23 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 628.67µs | +3.3% |  | 586.81µs | 738.13µs | 23 |

informational; points come from different runners of the same class, so read trends, not single deltas.
