## aui-perf nightly record

_14 points · 2026-09-03T05:27:14.273Z to 2026-09-16T04:39:36.149Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 644.55µs |  |  | 592.10µs | 644.55µs | 5 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 727.09µs |  |  | 668.74µs | 727.09µs | 5 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.20µs | +5.9% |  | 32.78µs | 42.08µs | 14 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 394.30µs | +4.8% |  | 369.38µs | 471.76µs | 14 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.162ms | +4.8% |  | 5.755ms | 7.384ms | 14 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 167.29µs | +0.2% |  | 154.14µs | 208.89µs | 14 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.540ms | +4.2% |  | 1.425ms | 1.897ms | 14 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.202ms | +5.8% |  | 5.665ms | 7.535ms | 14 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.15µs | +5.0% |  | 6.47µs | 7.65µs | 14 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.88µs | +3.8% |  | 52.55µs | 59.72µs | 14 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 220.88µs | +3.7% |  | 207.62µs | 235.90µs | 14 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 564.35µs | +11.9% |  | 487.10µs | 654.19µs | 14 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.166ms | +14.4% |  | 4.434ms | 6.076ms | 14 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.523ms | +14.4% |  | 17.461ms | 24.024ms | 14 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 353.27µs | +5.6% |  | 318.57µs | 495.40µs | 14 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.399ms | +10.3% |  | 2.939ms | 4.316ms | 14 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.660ms | +9.4% |  | 11.712ms | 17.276ms | 14 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.35µs |  |  | 23.84µs | 27.35µs | 5 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 291.82µs |  |  | 254.81µs | 291.82µs | 5 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.564ms |  |  | 1.384ms | 1.564ms | 5 |
| external-message-conversion › core: external message tool results › 100 matches | 29.67µs |  |  | 27.25µs | 29.67µs | 5 |
| external-message-conversion › core: external message tool results › 1000 matches | 300.59µs |  |  | 274.56µs | 300.59µs | 5 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.663ms |  |  | 1.515ms | 1.663ms | 5 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.04µs |  |  | 17.93µs | 20.04µs | 5 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 194.27µs |  |  | 174.80µs | 194.27µs | 5 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.080ms |  |  | 975.63µs | 1.080ms | 5 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +1.9% |  | 0.10µs | 0.12µs | 14 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +4.9% |  | 0.17µs | 0.21µs | 14 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.14µs | +2.3% |  | 1.03µs | 1.21µs | 14 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +5.7% |  | 0.32µs | 0.38µs | 14 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.76µs | +8.1% |  | 1.60µs | 1.97µs | 14 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.72µs | +7.3% |  | 14.09µs | 16.98µs | 14 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 72.20µs |  |  | 72.20µs | 78.05µs | 6 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 472.22µs |  |  | 452.51µs | 479.55µs | 6 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 442.61µs | -19.2% |  | 400.48µs | 712.00µs | 14 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.166ms | +11.2% |  | 1.035ms | 1.214ms | 14 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.411ms | +3.7% |  | 4.013ms | 5.103ms | 14 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.153ms | +3.5% |  | 1.097ms | 1.156ms | 13 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.098ms | +3.4% |  | 1.049ms | 1.142ms | 13 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.926ms | -0.2% |  | 2.470ms | 3.478ms | 13 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.75µs |  |  | 2.55µs | 2.75µs | 4 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.92µs |  |  | 10.92µs | 12.13µs | 4 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.51µs |  |  | 24.71µs | 26.51µs | 4 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 234.86µs |  |  | 206.12µs | 234.86µs | 4 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.813ms | -6.8% |  | 1.549ms | 2.309ms | 14 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.062ms | +22.3% |  | 11.058ms | 14.062ms | 14 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 199.916ms | +6.4% |  | 164.638ms | 219.705ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 299.09µs | -11.4% |  | 265.63µs | 337.76µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.634ms | -4.1% |  | 1.517ms | 1.812ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 54.890ms | +28.9% |  | 37.332ms | 54.890ms | 14 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 208.88µs |  |  | 195.87µs | 208.88µs | 7 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.780ms |  |  | 1.635ms | 1.780ms | 7 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 919.07µs |  |  | 847.12µs | 919.07µs | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.689ms | +0.1% |  | 1.582ms | 2.011ms | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.666ms | +0.6% |  | 1.558ms | 2.017ms | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.629ms | -1.0% |  | 1.497ms | 1.928ms | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.561ms | +10.1% |  | 1.403ms | 1.703ms | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 946.47µs | +2.8% |  | 876.38µs | 1.056ms | 14 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.515ms | +9.2% |  | 1.387ms | 1.756ms | 14 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.498ms | +8.1% |  | 1.384ms | 1.612ms | 14 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 188.02µs | +3.4% |  | 173.75µs | 199.08µs | 14 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 65.05µs | +4.2% |  | 60.35µs | 71.53µs | 14 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 788.86µs | +7.8% |  | 731.55µs | 928.53µs | 14 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 757.39µs | +9.1% |  | 689.02µs | 1.060ms | 14 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 776.00µs | +10.3% |  | 693.05µs | 1.242ms | 14 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.51µs | +1.4% |  | 35.28µs | 89.26µs | 14 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 634.02µs | +6.3% |  | 589.02µs | 765.54µs | 14 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.00µs | +3.9% |  | 32.95µs | 80.26µs | 14 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 632.75µs | +7.8% |  | 586.81µs | 738.13µs | 14 |

informational; points come from different runners of the same class, so read trends, not single deltas.
