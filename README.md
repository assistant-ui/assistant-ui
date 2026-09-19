## aui-perf nightly record

_17 points · 2026-09-03T05:27:14.273Z to 2026-09-19T04:37:13.977Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 638.23µs | +6.5% |  | 592.10µs | 644.55µs | 8 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 702.27µs | +4.5% |  | 668.74µs | 727.09µs | 8 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.64µs | -3.5% |  | 32.64µs | 42.08µs | 17 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 359.60µs | -5.5% |  | 359.60µs | 471.76µs | 17 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.607ms | -5.1% |  | 5.607ms | 7.384ms | 17 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 152.78µs | -7.5% |  | 152.78µs | 208.89µs | 17 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.426ms | -5.0% |  | 1.409ms | 1.897ms | 17 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.746ms | -4.5% |  | 5.633ms | 7.535ms | 17 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.74µs | +3.1% |  | 6.47µs | 7.65µs | 17 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.25µs | -2.6% |  | 52.55µs | 59.72µs | 17 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 206.56µs | -2.9% |  | 201.64µs | 235.90µs | 17 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 500.51µs | +2.6% |  | 487.10µs | 654.19µs | 17 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.498ms | +1.4% |  | 4.434ms | 6.076ms | 17 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.751ms | +1.7% |  | 17.461ms | 24.024ms | 17 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 291.94µs | -9.0% |  | 291.94µs | 495.40µs | 17 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.715ms | -7.6% |  | 2.715ms | 4.316ms | 17 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 10.815ms | -7.7% |  | 10.803ms | 17.276ms | 17 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.89µs | +3.8% |  | 23.84µs | 27.35µs | 8 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 249.56µs | -2.1% |  | 249.56µs | 291.82µs | 8 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.386ms | -0.0% |  | 1.384ms | 1.564ms | 8 |
| external-message-conversion › core: external message tool results › 100 matches | 32.28µs | +15.4% |  | 27.25µs | 32.99µs | 8 |
| external-message-conversion › core: external message tool results › 1000 matches | 324.10µs | +14.0% |  | 274.56µs | 331.32µs | 8 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.796ms | +18.1% |  | 1.515ms | 1.830ms | 8 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.83µs | +11.8% |  | 17.93µs | 22.45µs | 8 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 209.08µs | +15.8% |  | 174.80µs | 214.95µs | 8 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.194ms | +21.2% |  | 975.63µs | 1.228ms | 8 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -4.0% |  | 0.10µs | 0.12µs | 17 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.17µs | -5.2% |  | 0.17µs | 0.21µs | 17 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 0.99µs | -7.9% |  | 0.99µs | 1.21µs | 17 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.30µs | -8.8% |  | 0.30µs | 0.38µs | 17 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.88µs | +16.8% |  | 1.60µs | 1.97µs | 17 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.11µs | +19.4% |  | 14.09µs | 17.76µs | 17 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.49µs | +1.6% |  | 72.20µs | 78.05µs | 9 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 520.29µs | +12.2% |  | 452.51µs | 520.29µs | 9 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 538.59µs | +0.1% |  | 400.48µs | 712.00µs | 17 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.211ms | +15.8% |  | 1.035ms | 1.222ms | 17 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.213ms | +0.3% |  | 4.013ms | 5.103ms | 17 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.111ms | -0.1% |  | 1.097ms | 1.156ms | 16 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.130ms | +5.6% |  | 1.049ms | 1.142ms | 16 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.356ms | -32.2% |  | 2.356ms | 3.478ms | 16 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.08µs |  |  | 2.55µs | 3.12µs | 7 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.41µs |  |  | 10.92µs | 12.41µs | 7 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.39µs |  |  | 24.71µs | 30.43µs | 7 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 286.06µs |  |  | 206.12µs | 286.06µs | 7 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.674ms | -9.0% |  | 1.549ms | 2.309ms | 17 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.375ms | +8.4% |  | 11.058ms | 14.062ms | 17 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 150.737ms | -13.9% |  | 150.737ms | 219.705ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 371.39µs | +27.7% |  | 265.63µs | 378.51µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.708ms | +8.2% |  | 1.517ms | 1.812ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 35.328ms | -11.0% |  | 35.328ms | 54.890ms | 17 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 178.72µs | -10.2% |  | 178.72µs | 208.88µs | 10 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.531ms | -6.3% |  | 1.531ms | 1.780ms | 10 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 782.04µs | -7.7% |  | 782.04µs | 919.07µs | 10 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.691ms | -1.4% |  | 1.582ms | 2.011ms | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.633ms | -1.8% |  | 1.558ms | 2.017ms | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.585ms | -3.7% |  | 1.497ms | 1.928ms | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.420ms | +0.3% |  | 1.403ms | 1.703ms | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 953.10µs | +4.6% |  | 876.38µs | 1.056ms | 17 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.447ms | -0.2% |  | 1.387ms | 1.756ms | 17 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.455ms | -0.0% |  | 1.384ms | 1.612ms | 17 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 195.63µs | +12.1% |  | 173.75µs | 201.76µs | 17 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.84µs | +0.1% |  | 60.35µs | 71.53µs | 17 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 744.74µs | -2.2% |  | 731.55µs | 928.53µs | 17 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 782.08µs | +12.6% |  | 689.02µs | 1.060ms | 17 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 805.26µs | +12.3% |  | 693.05µs | 1.242ms | 17 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 37.03µs | +1.2% |  | 35.28µs | 89.26µs | 17 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 661.39µs | +9.2% |  | 589.02µs | 765.54µs | 17 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.81µs | +5.6% |  | 32.95µs | 80.26µs | 17 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 618.60µs | +4.2% |  | 586.81µs | 738.13µs | 17 |

informational; points come from different runners of the same class, so read trends, not single deltas.
