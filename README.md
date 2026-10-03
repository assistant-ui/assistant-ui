## aui-perf nightly record

_31 points · 2026-09-03T05:27:14.273Z to 2026-10-03T04:39:56.862Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 592.35µs | -3.3% |  | 592.10µs | 680.22µs | 22 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 702.29µs | +2.0% |  | 665.78µs | 760.33µs | 22 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.32µs | +0.3% |  | 32.52µs | 42.08µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 380.03µs | +2.1% |  | 359.60µs | 471.76µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.857ms | +4.0% |  | 5.607ms | 7.384ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 160.92µs | +4.6% |  | 152.78µs | 208.89µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.461ms | +6.2% |  | 1.375ms | 1.897ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.886ms | +5.7% |  | 5.570ms | 7.535ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.80µs | -0.3% |  | 6.47µs | 7.65µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.31µs | -1.9% |  | 52.55µs | 59.72µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 210.78µs | +2.8% |  | 201.64µs | 243.56µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 553.50µs | +8.5% |  | 487.10µs | 654.19µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.989ms | +11.2% |  | 4.434ms | 6.076ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.660ms | +10.9% |  | 17.461ms | 24.024ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 330.13µs | +10.2% |  | 291.94µs | 495.40µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.073ms | +10.4% |  | 2.715ms | 4.316ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.455ms | +13.8% |  | 10.803ms | 17.276ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.79µs | -6.4% |  | 23.84µs | 27.41µs | 22 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 266.42µs | +1.5% |  | 249.56µs | 293.53µs | 22 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.420ms | +0.3% |  | 1.384ms | 1.564ms | 22 |
| external-message-conversion › core: external message tool results › 100 matches | 33.84µs | -13.6% |  | 27.25µs | 39.67µs | 22 |
| external-message-conversion › core: external message tool results › 1000 matches | 341.87µs | -13.2% |  | 274.56µs | 396.86µs | 22 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.857ms | -14.3% |  | 1.515ms | 2.169ms | 22 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.98µs | -14.2% |  | 17.93µs | 23.98µs | 22 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 194.54µs | -13.5% |  | 174.51µs | 230.06µs | 22 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.044ms | -19.3% |  | 975.63µs | 1.304ms | 22 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -3.7% |  | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | -3.9% |  | 0.17µs | 0.21µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.20µs | +7.8% |  | 0.99µs | 1.33µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +10.4% |  | 0.30µs | 0.38µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.81µs | -10.1% |  | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.98µs | -12.9% |  | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.43µs | -2.4% |  | 70.58µs | 86.70µs | 23 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 486.66µs | -2.0% |  | 447.91µs | 596.48µs | 23 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 512.42µs | -20.2% |  | 371.23µs | 712.00µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.063ms | -6.9% |  | 1.026ms | 1.222ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.372ms | -1.3% |  | 4.007ms | 5.183ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.134ms | +1.3% |  | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.089ms | +0.2% |  | 1.044ms | 1.142ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.748ms | +24.4% |  | 2.210ms | 3.478ms | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.68µs | -13.8% |  | 2.52µs | 3.21µs | 21 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.60µs | -5.5% |  | 10.92µs | 13.96µs | 21 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.77µs | -14.6% |  | 24.38µs | 30.73µs | 21 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 225.40µs | -20.8% |  | 206.12µs | 287.79µs | 21 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.026ms | +0.5% |  | 1.549ms | 2.541ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.223ms | +8.0% |  | 11.058ms | 16.358ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 198.188ms | +24.4% |  | 150.737ms | 240.613ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 226.12µs |  |  | 226.12µs | 268.00µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 380.73µs |  |  | 380.73µs | 447.38µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.565ms |  |  | 1.565ms | 2.191ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 208.87µs |  |  | 208.87µs | 254.12µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 782.83µs |  |  | 782.83µs | 976.95µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 11.789ms |  |  | 11.789ms | 11.811ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 187.28µs |  |  | 187.28µs | 267.92µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 624.37µs |  |  | 624.37µs | 830.44µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 7.175ms |  |  | 7.175ms | 8.891ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 111.41µs |  |  | 103.32µs | 111.41µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 199.86µs |  |  | 199.86µs | 235.11µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.392ms |  |  | 1.392ms | 1.624ms | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.16µs |  |  | 7.16µs | 7.47µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.64µs |  |  | 14.64µs | 15.90µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 111.59µs |  |  | 106.19µs | 111.59µs | 2 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 210.15µs | -3.9% |  | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 564.91µs | -8.4% |  | 525.36µs | 1.812ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.339ms | -10.0% |  | 5.537ms | 54.890ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 211.03µs | +14.6% |  | 178.72µs | 221.60µs | 24 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.758ms | +13.9% |  | 1.531ms | 1.885ms | 24 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 913.24µs | +12.4% |  | 782.04µs | 964.22µs | 24 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.522ms | -7.9% |  | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.501ms | -13.0% |  | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.448ms | -12.3% |  | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.424ms | -0.6% |  | 1.394ms | 1.703ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 907.73µs | -11.7% |  | 876.38µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.369ms | -11.5% |  | 1.368ms | 1.756ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.365ms | -9.6% |  | 1.330ms | 1.612ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 126.13µs | -33.6% |  | 114.84µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.76µs | -2.4% |  | 60.09µs | 71.53µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 709.53µs | -13.5% |  | 709.53µs | 928.53µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 769.29µs | -0.4% |  | 689.02µs | 1.060ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 796.01µs | -2.4% |  | 693.05µs | 1.242ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.97µs | -2.9% |  | 35.23µs | 89.26µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 632.78µs | -7.0% |  | 589.02µs | 765.54µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.14µs | -1.4% |  | 32.33µs | 80.26µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 623.40µs | -2.4% |  | 586.81µs | 738.13µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
