## aui-perf nightly record

_32 points · 2026-09-03T05:27:14.273Z to 2026-10-04T06:01:54.538Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 600.27µs | -1.3% |  | 592.10µs | 680.22µs | 23 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 676.48µs | -0.4% |  | 665.78µs | 760.33µs | 23 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.17µs | -1.9% | -15.2% ⚠︎ | 32.52µs | 42.08µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 367.47µs | -2.9% | -17.5% ⚠︎ | 359.60µs | 471.76µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.732ms | -1.8% | -17.5% ⚠︎ | 5.607ms | 7.384ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 154.82µs | -1.4% | -18.4% ⚠︎ | 152.78µs | 208.89µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.428ms | -0.8% | -17.5% ⚠︎ | 1.375ms | 1.897ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.717ms | -0.1% | -17.1% ⚠︎ | 5.570ms | 7.535ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.63µs | +0.2% | -6.6% | 6.47µs | 7.65µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 54.43µs | +1.4% | -2.6% | 52.55µs | 59.72µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 214.99µs | +1.8% | -1.3% | 201.64µs | 243.56µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 507.74µs | -1.9% | -18.3% ⚠︎ | 487.10µs | 654.19µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.597ms | -2.0% | -18.9% ⚠︎ | 4.434ms | 6.076ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.265ms | -1.5% | -20.2% ⚠︎ | 17.461ms | 24.024ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 325.00µs | -2.5% | -25.3% ⚠︎ | 291.94µs | 495.40µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.028ms | -5.7% | -25.9% ⚠︎ | 2.715ms | 4.316ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.022ms | -3.2% | -26.5% ⚠︎ | 10.803ms | 17.276ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 23.95µs | -0.9% |  | 23.84µs | 27.41µs | 23 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 256.80µs | -1.9% |  | 249.56µs | 293.53µs | 23 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.400ms | -0.2% |  | 1.384ms | 1.564ms | 23 |
| external-message-conversion › core: external message tool results › 100 matches | 33.52µs | +2.9% |  | 27.25µs | 39.67µs | 23 |
| external-message-conversion › core: external message tool results › 1000 matches | 340.05µs | +1.5% |  | 274.56µs | 396.86µs | 23 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.862ms | +2.6% |  | 1.515ms | 2.169ms | 23 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.99µs | +2.9% |  | 17.93µs | 23.98µs | 23 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 195.88µs | +2.1% |  | 174.51µs | 230.06µs | 23 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.055ms | +0.9% |  | 975.63µs | 1.304ms | 23 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -2.5% | -12.2% ⚠︎ | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | -0.3% | +0.7% | 0.17µs | 0.21µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.17µs | -0.5% | +1.1% | 0.99µs | 1.33µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | +4.4% | -2.9% | 0.30µs | 0.38µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.69µs | -0.8% | -6.8% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.01µs | -2.1% | -8.2% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.51µs | +1.8% |  | 70.58µs | 86.70µs | 24 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 474.00µs | +5.1% |  | 447.91µs | 596.48µs | 24 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 503.15µs | -5.7% | -16.0% ⚠︎ | 371.23µs | 712.00µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.021ms | -4.1% | -8.5% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.246ms | -3.4% | -7.8% | 4.007ms | 5.183ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.127ms | -0.6% | -1.8% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.056ms | +1.1% | -3.2% | 1.044ms | 1.142ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.551ms | -7.2% | -3.7% | 2.210ms | 3.478ms | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.51µs | -1.0% |  | 2.51µs | 3.21µs | 22 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.77µs | -4.9% |  | 10.77µs | 13.96µs | 22 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.32µs | -0.6% |  | 24.32µs | 30.73µs | 22 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 229.52µs | -1.4% |  | 206.12µs | 287.79µs | 22 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.880ms | +2.8% | -6.4% | 1.549ms | 2.541ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 11.980ms | -1.8% | -1.1% | 11.058ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 183.693ms | -0.0% | -7.0% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 199.70µs |  |  | 199.70µs | 268.00µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 353.33µs |  |  | 353.33µs | 447.38µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.495ms |  |  | 1.495ms | 2.191ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 201.20µs |  |  | 201.20µs | 254.12µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 799.84µs |  |  | 782.83µs | 976.95µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 10.547ms |  |  | 10.547ms | 11.811ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 186.53µs |  |  | 186.53µs | 267.92µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 623.82µs |  |  | 623.82µs | 830.44µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 6.362ms |  |  | 6.362ms | 8.891ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 83.88µs |  |  | 83.88µs | 111.41µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 187.52µs |  |  | 187.52µs | 235.11µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.311ms |  |  | 1.311ms | 1.624ms | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.55µs |  |  | 6.55µs | 7.47µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.55µs |  |  | 14.55µs | 15.90µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 105.78µs |  |  | 105.78µs | 111.59µs | 3 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 185.21µs | -2.0% | -40.3% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 523.48µs | -2.6% | -68.0% ⚠︎ | 523.48µs | 1.812ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.027ms | -2.5% | -88.6% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 205.35µs | +5.3% |  | 178.72µs | 221.60µs | 25 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.698ms | +3.5% |  | 1.531ms | 1.885ms | 25 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 881.39µs | +3.7% |  | 782.04µs | 964.22µs | 25 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.517ms | -6.2% | -11.5% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.543ms | -6.9% | -10.5% ⚠︎ | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.483ms | -8.4% | -11.2% ⚠︎ | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.383ms | -1.2% | -8.1% | 1.383ms | 1.703ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 860.59µs | -7.6% | -7.9% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.337ms | -9.7% | -9.6% | 1.337ms | 1.756ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.348ms | -9.6% | -8.8% | 1.330ms | 1.612ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 119.61µs | -33.2% | -35.9% ⚠︎ | 114.84µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.67µs | -0.2% | -7.4% | 60.09µs | 71.53µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 693.26µs | -11.6% | -16.7% ⚠︎ | 693.26µs | 928.53µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 770.10µs | +8.7% | -18.8% ⚠︎ | 689.02µs | 1.060ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 767.36µs | +4.3% | -26.7% ⚠︎ | 693.05µs | 1.242ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 34.52µs | -4.2% | -54.3% ⚠︎ | 34.52µs | 89.26µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 616.59µs | -1.5% | -9.6% | 589.02µs | 765.54µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.22µs | -5.8% | -54.6% ⚠︎ | 32.22µs | 80.26µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 615.55µs | -4.5% | -10.7% ⚠︎ | 586.81µs | 738.13µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
