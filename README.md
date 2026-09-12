## aui-perf nightly record

_10 points · 2026-09-03T05:27:14.273Z to 2026-09-12T04:32:16.615Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 599.46µs |  |  | 599.46µs | 599.46µs | 1 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 672.32µs |  |  | 672.32µs | 672.32µs | 1 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.84µs | -1.5% |  | 33.23µs | 42.08µs | 10 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 380.55µs | -4.0% |  | 372.61µs | 471.76µs | 10 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.906ms | -4.9% |  | 5.770ms | 7.384ms | 10 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 165.25µs | -5.1% |  | 159.07µs | 208.89µs | 10 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.501ms | -5.6% |  | 1.445ms | 1.897ms | 10 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.014ms | -2.6% |  | 5.725ms | 7.535ms | 10 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.54µs | +0.0% |  | 6.47µs | 7.65µs | 10 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 54.66µs | +2.7% |  | 52.55µs | 59.72µs | 10 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 212.74µs | +0.7% |  | 209.65µs | 235.90µs | 10 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 488.05µs | -15.7% |  | 488.05µs | 654.19µs | 10 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.434ms | -16.3% |  | 4.434ms | 6.076ms | 10 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.461ms | -17.7% |  | 17.461ms | 24.024ms | 10 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 320.74µs | -21.1% |  | 320.74µs | 495.40µs | 10 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.939ms | -23.2% |  | 2.939ms | 4.316ms | 10 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 11.712ms | -23.4% |  | 11.712ms | 17.276ms | 10 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 23.98µs |  |  | 23.98µs | 23.98µs | 1 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 254.81µs |  |  | 254.81µs | 254.81µs | 1 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.386ms |  |  | 1.386ms | 1.386ms | 1 |
| external-message-conversion › core: external message tool results › 100 matches | 27.96µs |  |  | 27.96µs | 27.96µs | 1 |
| external-message-conversion › core: external message tool results › 1000 matches | 284.37µs |  |  | 284.37µs | 284.37µs | 1 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.520ms |  |  | 1.520ms | 1.520ms | 1 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.53µs |  |  | 19.53µs | 19.53µs | 1 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 180.53µs |  |  | 180.53µs | 180.53µs | 1 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 985.47µs |  |  | 985.47µs | 985.47µs | 1 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +1.0% |  | 0.10µs | 0.12µs | 10 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs | +1.6% |  | 0.17µs | 0.21µs | 10 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.07µs | +0.8% |  | 1.05µs | 1.21µs | 10 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | +2.2% |  | 0.32µs | 0.38µs | 10 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.61µs | -3.9% |  | 1.61µs | 1.97µs | 10 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.33µs | -4.6% |  | 14.33µs | 16.98µs | 10 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 74.30µs |  |  | 74.30µs | 78.05µs | 2 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 463.87µs |  |  | 463.87µs | 479.55µs | 2 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 538.32µs | +3.4% |  | 520.64µs | 712.00µs | 10 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.046ms | +0.7% |  | 1.035ms | 1.214ms | 10 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.203ms | -1.3% |  | 4.203ms | 5.103ms | 10 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.113ms | -0.3% |  | 1.097ms | 1.147ms | 9 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.069ms | +0.8% |  | 1.049ms | 1.142ms | 9 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.478ms | +35.3% |  | 2.470ms | 3.478ms | 9 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.838ms | +2.1% |  | 1.719ms | 2.309ms | 10 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.419ms | +3.0% |  | 11.058ms | 13.665ms | 10 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 175.083ms | -0.8% |  | 164.638ms | 219.705ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 290.87µs | +1.0% |  | 265.63µs | 337.76µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.579ms | +2.9% |  | 1.517ms | 1.812ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 39.682ms | -6.9% |  | 37.332ms | 53.082ms | 10 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 199.01µs |  |  | 199.01µs | 203.26µs | 3 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.635ms |  |  | 1.635ms | 1.706ms | 3 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 847.12µs |  |  | 847.12µs | 872.27µs | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.715ms | -1.1% |  | 1.582ms | 2.011ms | 10 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.663ms | -5.6% |  | 1.558ms | 2.017ms | 10 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.646ms | -3.1% |  | 1.497ms | 1.928ms | 10 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.417ms | -5.5% |  | 1.403ms | 1.703ms | 10 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 911.20µs | -4.3% |  | 888.89µs | 1.056ms | 10 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.450ms | +1.6% |  | 1.387ms | 1.756ms | 10 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.456ms | +3.1% |  | 1.386ms | 1.612ms | 10 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 174.48µs | -5.9% |  | 173.75µs | 199.08µs | 10 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.77µs | -4.6% |  | 61.52µs | 71.53µs | 10 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 761.89µs | +1.3% |  | 731.55µs | 928.53µs | 10 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 694.81µs | -24.8% |  | 694.09µs | 1.060ms | 10 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 716.93µs | -26.3% |  | 703.79µs | 1.242ms | 10 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.61µs | -48.9% |  | 36.02µs | 89.26µs | 10 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 605.90µs | -5.9% |  | 596.56µs | 765.54µs | 10 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.95µs | -51.0% |  | 32.95µs | 80.26µs | 10 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 593.79µs | -10.0% |  | 586.81µs | 738.13µs | 10 |

informational; points come from different runners of the same class, so read trends, not single deltas.
