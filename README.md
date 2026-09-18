## aui-perf nightly record

_16 points · 2026-09-03T05:27:14.273Z to 2026-09-18T04:38:11.115Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 614.90µs |  |  | 592.10µs | 644.55µs | 7 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 695.64µs |  |  | 668.74µs | 727.09µs | 7 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.82µs | +1.5% |  | 32.78µs | 42.08µs | 16 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 366.70µs | -1.6% |  | 366.70µs | 471.76µs | 16 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.683ms | -1.5% |  | 5.683ms | 7.384ms | 16 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.06µs | -3.7% |  | 154.14µs | 208.89µs | 16 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.409ms | -2.5% |  | 1.409ms | 1.897ms | 16 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.633ms | -1.6% |  | 5.633ms | 7.535ms | 16 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.81µs | +3.0% |  | 6.47µs | 7.65µs | 16 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 56.32µs | +4.6% |  | 52.55µs | 59.72µs | 16 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 201.64µs | -4.5% |  | 201.64µs | 235.90µs | 16 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 509.98µs | +2.5% |  | 487.10µs | 654.19µs | 16 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.578ms | +0.6% |  | 4.434ms | 6.076ms | 16 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 17.846ms | -0.2% |  | 17.461ms | 24.024ms | 16 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 294.43µs | -13.7% |  | 294.43µs | 495.40µs | 16 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.747ms | -10.7% |  | 2.747ms | 4.316ms | 16 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 10.803ms | -11.1% |  | 10.803ms | 17.276ms | 16 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 25.77µs |  |  | 23.84µs | 27.35µs | 7 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 260.97µs |  |  | 254.81µs | 291.82µs | 7 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.400ms |  |  | 1.384ms | 1.564ms | 7 |
| external-message-conversion › core: external message tool results › 100 matches | 32.99µs |  |  | 27.25µs | 32.99µs | 7 |
| external-message-conversion › core: external message tool results › 1000 matches | 331.32µs |  |  | 274.56µs | 331.32µs | 7 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.830ms |  |  | 1.515ms | 1.830ms | 7 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 22.45µs |  |  | 17.93µs | 22.45µs | 7 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 214.95µs |  |  | 174.80µs | 214.95µs | 7 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.228ms |  |  | 975.63µs | 1.228ms | 7 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -5.1% |  | 0.10µs | 0.12µs | 16 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +2.7% |  | 0.17µs | 0.21µs | 16 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.00µs | -7.3% |  | 1.00µs | 1.21µs | 16 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.31µs | -10.2% |  | 0.31µs | 0.38µs | 16 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.92µs | +17.3% |  | 1.60µs | 1.97µs | 16 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.76µs | +19.6% |  | 14.09µs | 17.76µs | 16 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.62µs | -3.1% |  | 72.20µs | 78.05µs | 8 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 503.32µs | +5.0% |  | 452.51µs | 503.32µs | 8 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 536.24µs | -6.2% |  | 400.48µs | 712.00µs | 16 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.222ms | +16.2% |  | 1.035ms | 1.222ms | 16 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.258ms | -0.8% |  | 4.013ms | 5.103ms | 16 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.120ms | +2.1% |  | 1.097ms | 1.156ms | 15 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.118ms | +4.5% |  | 1.049ms | 1.142ms | 15 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.466ms | -6.0% |  | 2.466ms | 3.478ms | 15 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.12µs |  |  | 2.55µs | 3.12µs | 6 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.40µs |  |  | 10.92µs | 12.40µs | 6 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.43µs |  |  | 24.71µs | 30.43µs | 6 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 285.82µs |  |  | 206.12µs | 285.82µs | 6 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.681ms | -10.7% |  | 1.549ms | 2.309ms | 16 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.607ms | +7.2% |  | 11.058ms | 14.062ms | 16 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 153.211ms | -15.4% |  | 153.211ms | 219.705ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 378.51µs | +12.5% |  | 265.63µs | 378.51µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.779ms | +3.9% |  | 1.517ms | 1.812ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 35.478ms | -28.8% |  | 35.478ms | 54.890ms | 16 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 182.30µs | -10.3% |  | 182.30µs | 208.88µs | 9 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.560ms | -7.1% |  | 1.560ms | 1.780ms | 9 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 805.82µs | -7.1% |  | 805.82µs | 919.07µs | 9 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.707ms | +3.3% |  | 1.582ms | 2.011ms | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.621ms | -2.7% |  | 1.558ms | 2.017ms | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.666ms | +5.8% |  | 1.497ms | 1.928ms | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.437ms | +2.4% |  | 1.403ms | 1.703ms | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 968.21µs | +8.9% |  | 876.38µs | 1.056ms | 16 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.434ms | -3.9% |  | 1.387ms | 1.756ms | 16 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.430ms | +0.0% |  | 1.384ms | 1.612ms | 16 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 201.76µs | +9.6% |  | 173.75µs | 201.76µs | 16 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.33µs | -1.8% |  | 60.35µs | 71.53µs | 16 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 734.00µs | -5.1% |  | 731.55µs | 928.53µs | 16 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 795.15µs | +10.8% |  | 689.02µs | 1.060ms | 16 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 804.65µs | +10.8% |  | 693.05µs | 1.242ms | 16 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.52µs | +1.2% |  | 35.28µs | 89.26µs | 16 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 648.20µs | +7.5% |  | 589.02µs | 765.54µs | 16 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.01µs | +2.1% |  | 32.95µs | 80.26µs | 16 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 630.92µs | +5.9% |  | 586.81µs | 738.13µs | 16 |

informational; points come from different runners of the same class, so read trends, not single deltas.
