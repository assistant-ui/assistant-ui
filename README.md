## aui-perf nightly record

_33 points · 2026-09-03T05:27:14.273Z to 2026-10-05T04:53:24.077Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 600.52µs | -0.5% |  | 592.10µs | 680.22µs | 24 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 670.25µs | -1.8% |  | 665.78µs | 760.33µs | 24 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.87µs | -2.3% | -4.4% | 32.52µs | 42.08µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 370.44µs | -0.1% | -6.6% | 359.60µs | 471.76µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.696ms | -2.8% | -8.2% | 5.607ms | 7.384ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 154.86µs | -0.2% | -11.1% ⚠︎ | 152.78µs | 208.89µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.439ms | +0.5% | -9.5% | 1.375ms | 1.897ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.762ms | +0.5% | -6.7% | 5.570ms | 7.535ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.60µs | +1.3% | +0.9% | 6.47µs | 7.65µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.46µs | +4.4% | +4.2% | 52.55µs | 59.72µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 221.10µs | +5.5% | +4.7% | 201.64µs | 243.56µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 514.08µs | -0.5% | -11.2% ⚠︎ | 487.10µs | 654.19µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.667ms | -0.3% | -11.9% ⚠︎ | 4.434ms | 6.076ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.588ms | -0.3% | -12.4% ⚠︎ | 17.461ms | 24.024ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 327.79µs | -1.8% | -19.4% ⚠︎ | 291.94µs | 495.40µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.122ms | +0.7% | -18.4% ⚠︎ | 2.715ms | 4.316ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.528ms | +0.5% | -18.1% ⚠︎ | 10.803ms | 17.276ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.63µs | +1.6% |  | 23.84µs | 27.41µs | 24 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 265.98µs | +2.7% |  | 249.56µs | 293.53µs | 24 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.407ms | -0.6% |  | 1.384ms | 1.564ms | 24 |
| external-message-conversion › core: external message tool results › 100 matches | 33.55µs | +2.6% |  | 27.25µs | 39.67µs | 24 |
| external-message-conversion › core: external message tool results › 1000 matches | 342.16µs | +3.5% |  | 274.56µs | 396.86µs | 24 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.856ms | +2.5% |  | 1.515ms | 2.169ms | 24 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.43µs | +5.6% |  | 17.93µs | 23.98µs | 24 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 200.98µs | +4.4% |  | 174.51µs | 230.06µs | 24 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.064ms | +0.9% |  | 975.63µs | 1.304ms | 24 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -5.2% | -3.9% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -0.6% | +10.7% ⚠︎ | 0.17µs | 0.21µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | -0.6% | +13.3% ⚠︎ | 0.99µs | 1.33µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +0.1% | +8.2% | 0.30µs | 0.38µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.77µs | +2.0% | +5.8% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.13µs | +4.0% | +7.4% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.44µs | +0.1% |  | 70.58µs | 86.70µs | 25 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 496.24µs | +10.8% |  | 447.91µs | 596.48µs | 25 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 518.08µs | +2.8% | -0.5% | 371.23µs | 712.00µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.042ms | +1.6% | +0.4% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.329ms | +3.1% | +1.7% | 4.007ms | 5.183ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.114ms | -0.7% | -0.3% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.069ms | +1.4% | +0.7% | 1.044ms | 1.142ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.749ms | -2.9% | +7.0% | 2.210ms | 3.478ms | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.58µs | -2.9% |  | 2.51µs | 3.21µs | 23 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.15µs | -13.0% |  | 10.15µs | 13.96µs | 23 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.80µs | -4.0% |  | 24.32µs | 30.73µs | 23 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 225.50µs | -3.1% |  | 206.12µs | 287.79µs | 23 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.916ms | +1.8% | +6.4% | 1.549ms | 2.541ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.268ms | +4.8% | +10.7% ⚠︎ | 11.058ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 185.421ms | +2.6% | +5.1% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 213.68µs |  |  | 199.70µs | 268.00µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 392.22µs |  |  | 353.33µs | 447.38µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.585ms |  |  | 1.495ms | 2.191ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 232.32µs |  |  | 201.20µs | 254.12µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 841.63µs |  |  | 782.83µs | 976.95µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 10.327ms |  |  | 10.327ms | 11.811ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 187.45µs |  |  | 186.53µs | 267.92µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 632.28µs |  |  | 623.82µs | 830.44µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 6.693ms |  |  | 6.362ms | 8.891ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 96.70µs |  |  | 83.88µs | 111.41µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 189.36µs |  |  | 187.52µs | 235.11µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.291ms |  |  | 1.291ms | 1.624ms | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.79µs |  |  | 6.55µs | 7.47µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.08µs |  |  | 14.55µs | 15.90µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 106.29µs |  |  | 105.78µs | 111.59µs | 4 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 186.92µs | -4.4% | -35.1% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 569.01µs | +7.7% | -62.9% ⚠︎ | 523.48µs | 1.812ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.017ms | -7.5% | -85.9% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 212.80µs | +8.1% |  | 178.72µs | 221.60µs | 26 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.717ms | +4.8% |  | 1.531ms | 1.885ms | 26 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 897.50µs | +4.9% |  | 782.04µs | 964.22µs | 26 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.521ms | -6.3% | -12.3% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.519ms | -3.3% | -13.7% ⚠︎ | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.473ms | -8.5% | -13.2% ⚠︎ | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.400ms | -1.0% | -6.5% | 1.383ms | 1.703ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 884.97µs | -3.2% | -7.1% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.380ms | -3.0% | -3.3% | 1.337ms | 1.756ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.414ms | +0.7% | +0.2% | 1.330ms | 1.612ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 115.52µs | -33.1% | -37.7% ⚠︎ | 114.84µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.65µs | +1.3% | -3.2% | 60.09µs | 71.53µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 727.81µs | -1.3% | -3.3% | 693.26µs | 928.53µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 772.27µs | +8.5% | -16.4% ⚠︎ | 689.02µs | 1.060ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 749.71µs | +4.7% | -23.0% ⚠︎ | 693.05µs | 1.242ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.51µs | -4.9% | -50.5% ⚠︎ | 34.52µs | 89.26µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 634.59µs | +2.2% | -1.4% | 589.02µs | 765.54µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.01µs | -5.4% | -50.9% ⚠︎ | 32.22µs | 80.26µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 630.36µs | -2.5% | -4.5% | 586.81µs | 738.13µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
