## aui-perf nightly record

_30 points · 2026-09-03T05:27:14.273Z to 2026-10-02T04:37:50.453Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 606.52µs | -0.4% |  | 592.10µs | 680.22µs | 21 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 725.63µs | +4.9% |  | 665.78µs | 760.33µs | 21 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.59µs | -1.8% |  | 32.52µs | 42.08µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 364.31µs | -2.2% |  | 359.60µs | 471.76µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.651ms | -3.7% |  | 5.607ms | 7.384ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 155.51µs | -2.4% |  | 152.78µs | 208.89µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.405ms | -4.3% |  | 1.375ms | 1.897ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.679ms | -4.5% |  | 5.570ms | 7.535ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.85µs | +2.9% |  | 6.47µs | 7.65µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.28µs | +4.3% |  | 52.55µs | 59.72µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 215.05µs | +2.2% |  | 201.64µs | 243.56µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 516.36µs | -2.0% |  | 487.10µs | 654.19µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.578ms | -3.3% |  | 4.434ms | 6.076ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.206ms | -3.9% |  | 17.461ms | 24.024ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 317.64µs | -5.3% |  | 291.94µs | 495.40µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.899ms | -5.6% |  | 2.715ms | 4.316ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 11.338ms | -8.0% |  | 10.803ms | 17.276ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 25.66µs | +2.5% |  | 23.84µs | 27.41µs | 21 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 258.02µs | -7.3% |  | 249.56µs | 293.53µs | 21 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.404ms | -4.4% |  | 1.384ms | 1.564ms | 21 |
| external-message-conversion › core: external message tool results › 100 matches | 39.67µs | +20.7% |  | 27.25µs | 39.67µs | 21 |
| external-message-conversion › core: external message tool results › 1000 matches | 396.86µs | +17.4% |  | 274.56µs | 396.86µs | 21 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.169ms | +20.2% |  | 1.515ms | 2.169ms | 21 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 23.98µs | +22.4% |  | 17.93µs | 23.98µs | 21 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 230.06µs | +20.6% |  | 174.51µs | 230.06µs | 21 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.304ms | +25.0% |  | 975.63µs | 1.304ms | 21 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +3.5% |  | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +4.3% |  | 0.17µs | 0.21µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.15µs | -5.2% |  | 0.99µs | 1.33µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -3.1% |  | 0.30µs | 0.38µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.10µs | +22.5% |  | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.26µs | +26.2% |  | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 79.82µs | +3.6% |  | 70.58µs | 86.70µs | 22 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 514.05µs | +3.5% |  | 447.91µs | 596.48µs | 22 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 673.88µs | +21.8% |  | 371.23µs | 712.00µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.160ms | +6.0% |  | 1.026ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.410ms | -3.5% |  | 4.007ms | 5.183ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.095ms | -2.7% |  | 1.095ms | 1.180ms | 29 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.082ms | +2.0% |  | 1.044ms | 1.142ms | 29 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.219ms | -19.7% |  | 2.210ms | 3.478ms | 29 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.21µs | +23.2% |  | 2.52µs | 3.21µs | 20 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.49µs | -0.5% |  | 10.92µs | 13.96µs | 20 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.73µs | +19.2% |  | 24.38µs | 30.73µs | 20 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 287.79µs | +15.5% |  | 206.12µs | 287.79µs | 20 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.067ms | +2.0% |  | 1.549ms | 2.541ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.570ms | -7.9% |  | 11.058ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 160.683ms | -18.5% |  | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 268.00µs |  |  | 268.00µs | 268.00µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 447.38µs |  |  | 447.38µs | 447.38µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.191ms |  |  | 2.191ms | 2.191ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 254.12µs |  |  | 254.12µs | 254.12µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 976.95µs |  |  | 976.95µs | 976.95µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 11.811ms |  |  | 11.811ms | 11.811ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 267.92µs |  |  | 267.92µs | 267.92µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 830.44µs |  |  | 830.44µs | 830.44µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 8.891ms |  |  | 8.891ms | 8.891ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 103.32µs |  |  | 103.32µs | 103.32µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 235.11µs |  |  | 235.11µs | 235.11µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.624ms |  |  | 1.624ms | 1.624ms | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.47µs |  |  | 7.47µs | 7.47µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.90µs |  |  | 15.90µs | 15.90µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 106.19µs |  |  | 106.19µs | 106.19µs | 1 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 211.34µs | +6.2% |  | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 643.26µs | +17.9% |  | 525.36µs | 1.812ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.712ms | +13.9% |  | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 185.08µs | -9.9% |  | 178.72µs | 221.60µs | 23 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.563ms | -9.1% |  | 1.531ms | 1.885ms | 23 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 817.93µs | -8.3% |  | 782.04µs | 964.22µs | 23 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.569ms | -0.9% |  | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.598ms | -2.5% |  | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.519ms | +0.8% |  | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.469ms | +5.4% |  | 1.394ms | 1.703ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 985.92µs | +4.2% |  | 876.38µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.403ms | -4.1% |  | 1.368ms | 1.756ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.392ms | -4.0% |  | 1.330ms | 1.612ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 114.84µs | -40.3% |  | 114.84µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.95µs | +2.7% |  | 60.09µs | 71.53µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 724.11µs | -5.3% |  | 716.71µs | 928.53µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 811.21µs | +15.3% |  | 689.02µs | 1.060ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 831.10µs | +16.9% |  | 693.05µs | 1.242ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.87µs | -3.4% |  | 35.23µs | 89.26µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 671.35µs | +12.5% |  | 589.02µs | 765.54µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.67µs | -10.4% |  | 32.33µs | 80.26µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 623.96µs | -0.7% |  | 586.81µs | 738.13µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
