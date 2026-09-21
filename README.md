## aui-perf nightly record

_19 points · 2026-09-03T05:27:14.273Z to 2026-09-21T04:41:27.032Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 595.19µs | +0.5% |  | 592.10µs | 644.55µs | 10 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 665.78µs | -1.2% |  | 665.78µs | 727.09µs | 10 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.52µs | -2.4% |  | 32.52µs | 42.08µs | 19 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 365.78µs | -2.6% |  | 359.60µs | 471.76µs | 19 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.725ms | -2.0% |  | 5.607ms | 7.384ms | 19 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 156.03µs | +0.8% |  | 152.78µs | 208.89µs | 19 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.414ms | -2.7% |  | 1.409ms | 1.897ms | 19 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.675ms | -1.9% |  | 5.633ms | 7.535ms | 19 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.52µs | -0.7% |  | 6.47µs | 7.65µs | 19 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.29µs | +1.1% |  | 52.55µs | 59.72µs | 19 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 210.82µs | +1.5% |  | 201.64µs | 235.90µs | 19 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 513.77µs | +5.5% |  | 487.10µs | 654.19µs | 19 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.718ms | +5.6% |  | 4.434ms | 6.076ms | 19 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.717ms | +5.5% |  | 17.461ms | 24.024ms | 19 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 321.29µs | +0.9% |  | 291.94µs | 495.40µs | 19 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.037ms | +1.7% |  | 2.715ms | 4.316ms | 19 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.328ms | +2.2% |  | 10.803ms | 17.276ms | 19 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.36µs | +2.2% |  | 23.84µs | 27.35µs | 10 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 265.51µs | +2.7% |  | 249.56µs | 291.82µs | 10 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.424ms | +2.9% |  | 1.384ms | 1.564ms | 10 |
| external-message-conversion › core: external message tool results › 100 matches | 33.42µs | +20.9% |  | 27.25µs | 33.42µs | 10 |
| external-message-conversion › core: external message tool results › 1000 matches | 338.00µs | +20.6% |  | 274.56µs | 338.00µs | 10 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.862ms | +22.9% |  | 1.515ms | 1.862ms | 10 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.01µs | +0.4% |  | 17.93µs | 22.45µs | 10 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 174.51µs | -0.2% |  | 174.51µs | 214.95µs | 10 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 983.29µs | +0.8% |  | 975.63µs | 1.228ms | 10 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | +0.3% |  | 0.10µs | 0.12µs | 19 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.18µs | -0.7% |  | 0.17µs | 0.21µs | 19 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.04µs | -1.3% |  | 0.99µs | 1.21µs | 19 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs | -3.8% |  | 0.30µs | 0.38µs | 19 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.63µs | -0.8% |  | 1.58µs | 1.97µs | 19 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.46µs | -0.5% |  | 14.02µs | 17.76µs | 19 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 70.58µs | -3.5% |  | 70.58µs | 78.05µs | 11 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 452.59µs | -4.4% |  | 452.51µs | 520.29µs | 11 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 381.70µs | -5.2% |  | 381.70µs | 712.00µs | 19 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.042ms | -1.8% |  | 1.035ms | 1.222ms | 19 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.011ms | -0.0% |  | 4.011ms | 5.103ms | 19 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.166ms | +3.1% |  | 1.097ms | 1.166ms | 18 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.052ms | -0.7% |  | 1.049ms | 1.142ms | 18 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.894ms | +6.2% |  | 2.356ms | 3.478ms | 18 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.54µs | -0.4% |  | 2.52µs | 3.12µs | 9 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.24µs | -1.8% |  | 10.92µs | 12.41µs | 9 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.57µs | -5.2% |  | 24.38µs | 30.43µs | 9 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 222.97µs | +8.2% |  | 206.12µs | 286.06µs | 9 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.614ms | +2.0% |  | 1.549ms | 2.309ms | 19 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.079ms | +2.6% |  | 11.058ms | 14.062ms | 19 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 174.503ms | +0.4% |  | 150.737ms | 219.705ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 168.27µs | -40.7% |  | 168.27µs | 378.51µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 525.36µs | -67.3% |  | 525.36µs | 1.812ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 5.657ms | -88.5% |  | 5.657ms | 54.890ms | 19 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 192.19µs | -3.9% |  | 178.72µs | 208.88µs | 12 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.655ms | -3.4% |  | 1.531ms | 1.780ms | 12 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 852.81µs | -0.9% |  | 782.04µs | 919.07µs | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.635ms | -0.3% |  | 1.582ms | 2.011ms | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.607ms | +1.3% |  | 1.558ms | 2.017ms | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.530ms | -0.9% |  | 1.497ms | 1.928ms | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.414ms | -0.4% |  | 1.403ms | 1.703ms | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 881.98µs | -2.1% |  | 876.38µs | 1.056ms | 19 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.402ms | -2.4% |  | 1.387ms | 1.756ms | 19 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.415ms | -1.3% |  | 1.384ms | 1.612ms | 19 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 175.75µs | -2.8% |  | 173.75µs | 201.76µs | 19 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.27µs | -1.0% |  | 60.09µs | 71.53µs | 19 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 727.85µs | -4.0% |  | 727.85µs | 928.53µs | 19 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 716.59µs | +2.2% |  | 689.02µs | 1.060ms | 19 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 709.23µs | +2.3% |  | 693.05µs | 1.242ms | 19 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.25µs | -1.4% |  | 35.25µs | 89.26µs | 19 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 627.45µs | +0.9% |  | 589.02µs | 765.54µs | 19 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.52µs | -0.9% |  | 32.95µs | 80.26µs | 19 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 598.94µs | +0.7% |  | 586.81µs | 738.13µs | 19 |

informational; points come from different runners of the same class, so read trends, not single deltas.
