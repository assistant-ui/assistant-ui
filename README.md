## aui-perf nightly record

_21 points · 2026-09-03T05:27:14.273Z to 2026-09-23T04:39:57.829Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 671.22µs | +4.1% |  | 592.10µs | 671.22µs | 12 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 760.33µs | +4.6% |  | 665.78µs | 760.33µs | 12 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 39.44µs | +12.0% |  | 32.52µs | 42.08µs | 21 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 431.01µs | +9.3% |  | 359.60µs | 471.76µs | 21 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.794ms | +10.3% |  | 5.607ms | 7.384ms | 21 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 182.51µs | +9.1% |  | 152.78µs | 208.89µs | 21 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.699ms | +10.3% |  | 1.409ms | 1.897ms | 21 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.724ms | +8.4% |  | 5.633ms | 7.535ms | 21 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.49µs | +4.7% |  | 6.47µs | 7.65µs | 21 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 59.72µs | +6.9% |  | 52.55µs | 59.72µs | 21 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 243.56µs | +10.3% |  | 201.64µs | 243.56µs | 21 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 594.30µs | +5.3% |  | 487.10µs | 654.19µs | 21 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.381ms | +4.2% |  | 4.434ms | 6.076ms | 21 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 21.309ms | +3.8% |  | 17.461ms | 24.024ms | 21 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 383.45µs | +8.5% |  | 291.94µs | 495.40µs | 21 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.727ms | +9.7% |  | 2.715ms | 4.316ms | 21 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 14.797ms | +8.3% |  | 10.803ms | 17.276ms | 21 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.41µs | +0.2% |  | 23.84µs | 27.41µs | 12 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 293.53µs | +0.6% |  | 249.56µs | 293.53µs | 12 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.544ms | -1.3% |  | 1.384ms | 1.564ms | 12 |
| external-message-conversion › core: external message tool results › 100 matches | 36.03µs | +21.4% |  | 27.25µs | 36.03µs | 12 |
| external-message-conversion › core: external message tool results › 1000 matches | 361.61µs | +20.3% |  | 274.56µs | 361.61µs | 12 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.004ms | +20.5% |  | 1.515ms | 2.004ms | 12 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.42µs | +6.9% |  | 17.93µs | 22.45µs | 12 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 205.25µs | +5.7% |  | 174.51µs | 214.95µs | 12 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.160ms | +7.5% |  | 975.63µs | 1.228ms | 12 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +5.5% |  | 0.10µs | 0.12µs | 21 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +3.0% |  | 0.17µs | 0.21µs | 21 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.19µs | +4.1% |  | 0.99µs | 1.21µs | 21 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | +1.3% |  | 0.30µs | 0.38µs | 21 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.80µs | +2.3% |  | 1.58µs | 1.97µs | 21 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.75µs | +0.2% |  | 14.02µs | 17.76µs | 21 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 86.70µs | +20.1% |  | 70.58µs | 86.70µs | 13 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 596.48µs | +26.3% |  | 452.51µs | 596.48µs | 13 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 440.75µs | -0.4% |  | 381.70µs | 712.00µs | 21 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.196ms | +2.6% |  | 1.035ms | 1.222ms | 21 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.548ms | +3.1% |  | 4.011ms | 5.103ms | 21 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.116ms | -3.3% |  | 1.097ms | 1.166ms | 20 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.112ms | +1.3% |  | 1.049ms | 1.142ms | 20 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.959ms | +1.1% |  | 2.356ms | 3.478ms | 20 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.86µs | +4.0% |  | 2.52µs | 3.12µs | 11 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.20µs | +2.6% |  | 10.92µs | 12.41µs | 11 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 27.97µs | +5.5% |  | 24.38µs | 30.43µs | 11 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 251.67µs | +7.2% |  | 206.12µs | 286.06µs | 11 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.012ms | +11.0% |  | 1.549ms | 2.309ms | 21 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.221ms | +8.2% |  | 11.058ms | 15.221ms | 21 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 230.357ms | +15.2% |  | 150.737ms | 230.357ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 205.60µs | -31.3% |  | 168.27µs | 378.51µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 622.31µs | -61.9% |  | 525.36µs | 1.812ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.116ms | -87.0% |  | 5.657ms | 54.890ms | 21 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 219.89µs | +5.3% |  | 178.72µs | 219.89µs | 14 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.885ms | +5.9% |  | 1.531ms | 1.885ms | 14 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 964.22µs | +4.9% |  | 782.04µs | 964.22µs | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.102ms | +24.5% |  | 1.582ms | 2.102ms | 21 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.023ms | +21.4% |  | 1.558ms | 2.023ms | 21 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.970ms | +20.9% |  | 1.497ms | 1.970ms | 21 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.652ms | +5.8% |  | 1.403ms | 1.703ms | 21 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.091ms | +15.3% |  | 876.38µs | 1.091ms | 21 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.662ms | +9.7% |  | 1.387ms | 1.756ms | 21 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.608ms | +7.3% |  | 1.384ms | 1.612ms | 21 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 196.16µs | +4.3% |  | 173.75µs | 201.76µs | 21 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 71.44µs | +9.8% |  | 60.09µs | 71.53µs | 21 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 836.65µs | +6.1% |  | 727.85µs | 928.53µs | 21 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 834.32µs | +10.2% |  | 689.02µs | 1.060ms | 21 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 822.84µs | +6.0% |  | 693.05µs | 1.242ms | 21 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.11µs | +4.4% |  | 35.25µs | 89.26µs | 21 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 662.87µs | +4.6% |  | 589.02µs | 765.54µs | 21 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 36.76µs | +5.0% |  | 32.95µs | 80.26µs | 21 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 686.26µs | +8.5% |  | 586.81µs | 738.13µs | 21 |

informational; points come from different runners of the same class, so read trends, not single deltas.
