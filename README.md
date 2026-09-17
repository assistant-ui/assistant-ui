## aui-perf nightly record

_15 points · 2026-09-03T05:27:14.273Z to 2026-09-17T04:39:28.037Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 612.85µs |  |  | 592.10µs | 644.55µs | 6 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 683.96µs |  |  | 668.74µs | 727.09µs | 6 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.02µs | -0.5% |  | 32.78µs | 42.08µs | 15 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 393.77µs | +5.1% |  | 369.38µs | 471.76µs | 15 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.883ms | +0.8% |  | 5.755ms | 7.384ms | 15 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.52µs | -1.0% |  | 154.14µs | 208.89µs | 15 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.455ms | -0.5% |  | 1.425ms | 1.897ms | 15 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.778ms | -0.9% |  | 5.665ms | 7.535ms | 15 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.70µs | +1.8% |  | 6.47µs | 7.65µs | 15 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.97µs | +1.2% |  | 52.55µs | 59.72µs | 15 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 214.53µs | +2.1% |  | 207.62µs | 235.90µs | 15 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 528.43µs | +4.8% |  | 487.10µs | 654.19µs | 15 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.776ms | +4.3% |  | 4.434ms | 6.076ms | 15 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.984ms | +2.6% |  | 17.461ms | 24.024ms | 15 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 334.69µs | +1.3% |  | 318.57µs | 495.40µs | 15 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.169ms | +4.0% |  | 2.939ms | 4.316ms | 15 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.471ms | +0.7% |  | 11.712ms | 17.276ms | 15 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.25µs |  |  | 23.84µs | 27.35µs | 6 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 262.70µs |  |  | 254.81µs | 291.82µs | 6 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.424ms |  |  | 1.384ms | 1.564ms | 6 |
| external-message-conversion › core: external message tool results › 100 matches | 27.93µs |  |  | 27.25µs | 29.67µs | 6 |
| external-message-conversion › core: external message tool results › 1000 matches | 281.17µs |  |  | 274.56µs | 300.59µs | 6 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.524ms |  |  | 1.515ms | 1.663ms | 6 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.41µs |  |  | 17.93µs | 20.04µs | 6 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 179.43µs |  |  | 174.80µs | 194.27µs | 6 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 997.05µs |  |  | 975.63µs | 1.080ms | 6 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -3.4% |  | 0.10µs | 0.12µs | 15 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs | +0.7% |  | 0.17µs | 0.21µs | 15 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.07µs | -2.2% |  | 1.03µs | 1.21µs | 15 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -4.6% |  | 0.32µs | 0.38µs | 15 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.64µs | +1.7% |  | 1.60µs | 1.97µs | 15 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.74µs | +2.7% |  | 14.09µs | 16.98µs | 15 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.68µs |  |  | 72.20µs | 78.05µs | 7 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 461.73µs |  |  | 452.51µs | 479.55µs | 7 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 437.56µs | -19.9% |  | 400.48µs | 712.00µs | 15 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.087ms | +3.5% |  | 1.035ms | 1.214ms | 15 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.076ms | -4.4% |  | 4.013ms | 5.103ms | 15 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.140ms | +1.7% |  | 1.097ms | 1.156ms | 14 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.076ms | +1.2% |  | 1.049ms | 1.142ms | 14 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.882ms | +14.2% |  | 2.470ms | 3.478ms | 14 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.58µs |  |  | 2.55µs | 2.75µs | 5 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.62µs |  |  | 10.92µs | 12.13µs | 5 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.66µs |  |  | 24.71µs | 26.51µs | 5 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 230.92µs |  |  | 206.12µs | 234.86µs | 5 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.734ms | -4.1% |  | 1.549ms | 2.309ms | 15 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.800ms | +8.4% |  | 11.058ms | 14.062ms | 15 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 177.022ms | -2.6% |  | 164.638ms | 219.705ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 279.34µs | -8.2% |  | 265.63µs | 337.76µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.551ms | -0.7% |  | 1.517ms | 1.812ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 46.356ms | +10.1% |  | 37.332ms | 54.890ms | 15 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 196.37µs | -2.2% |  | 195.87µs | 208.88µs | 8 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.674ms | -1.9% |  | 1.635ms | 1.780ms | 8 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 863.82µs | -1.0% |  | 847.12µs | 919.07µs | 8 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.686ms | -3.4% |  | 1.582ms | 2.011ms | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.656ms | +6.3% |  | 1.558ms | 2.017ms | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.624ms | +8.5% |  | 1.497ms | 1.928ms | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.447ms | +2.8% |  | 1.403ms | 1.703ms | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 909.71µs | -0.6% |  | 876.38µs | 1.056ms | 15 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.505ms | +3.4% |  | 1.387ms | 1.756ms | 15 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.470ms | +1.2% |  | 1.384ms | 1.612ms | 15 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 190.76µs | +0.8% |  | 173.75µs | 199.08µs | 15 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.89µs | -1.8% |  | 60.35µs | 71.53µs | 15 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 776.95µs | +4.0% |  | 731.55µs | 928.53µs | 15 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 711.72µs | -7.0% |  | 689.02µs | 1.060ms | 15 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 700.85µs | -12.6% |  | 693.05µs | 1.242ms | 15 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.81µs | -10.2% |  | 35.28µs | 89.26µs | 15 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 627.01µs | -0.6% |  | 589.02µs | 765.54µs | 15 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.23µs | -33.9% |  | 32.95µs | 80.26µs | 15 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 608.72µs | -3.9% |  | 586.81µs | 738.13µs | 15 |

informational; points come from different runners of the same class, so read trends, not single deltas.
