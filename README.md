## aui-perf nightly record

_34 points · 2026-09-03T05:27:14.273Z to 2026-10-06T04:38:50.574Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 625.20µs | -8.1% |  | 592.10µs | 680.22µs | 25 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 702.40µs | -6.3% |  | 665.78µs | 760.33µs | 25 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.16µs | -5.5% | +2.4% | 32.52µs | 42.08µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 381.64µs | -6.0% | -1.4% | 359.60µs | 471.76µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.935ms | -5.3% | -2.5% | 5.607ms | 7.384ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 166.58µs | -2.7% | +1.8% | 152.78µs | 208.89µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.521ms | -1.7% | -2.3% | 1.375ms | 1.897ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.091ms | -3.1% | -0.2% | 5.570ms | 7.535ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.79µs | -8.2% | +4.9% | 6.52µs | 7.65µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.32µs | -7.1% | +5.3% | 52.72µs | 59.72µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 218.34µs | -5.6% | +4.1% | 201.64µs | 243.56µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 34.42µs |  |  | 34.42µs | 34.42µs | 1 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 328.87µs |  |  | 328.87µs | 328.87µs | 1 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.27µs |  |  | 4.27µs | 4.27µs | 1 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.30µs |  |  | 35.30µs | 35.30µs | 1 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 518.60µs | -10.2% | -8.8% | 487.10µs | 654.19µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.712ms | -10.3% | -9.2% | 4.434ms | 6.076ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.597ms | -10.4% | -9.5% | 17.461ms | 24.024ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 328.09µs | -10.2% | -17.4% ⚠︎ | 291.94µs | 495.40µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.075ms | -9.8% | -16.6% ⚠︎ | 2.715ms | 4.316ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.358ms | -7.2% | -17.1% ⚠︎ | 10.803ms | 17.276ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.68µs | -7.9% |  | 23.84µs | 27.41µs | 25 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 264.18µs | -9.8% |  | 249.56µs | 293.53µs | 25 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.416ms | -7.6% |  | 1.384ms | 1.564ms | 25 |
| external-message-conversion › core: external message tool results › 100 matches | 33.41µs | -9.1% |  | 27.25µs | 39.67µs | 25 |
| external-message-conversion › core: external message tool results › 1000 matches | 342.32µs | -8.5% |  | 274.56µs | 396.86µs | 25 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.860ms | -7.2% |  | 1.515ms | 2.169ms | 25 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.40µs | -6.3% |  | 17.93µs | 23.98µs | 25 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 197.51µs | -8.2% |  | 174.51µs | 230.06µs | 25 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.087ms | -7.6% |  | 975.63µs | 1.304ms | 25 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -7.3% | -0.0% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -6.8% | +13.7% ⚠︎ | 0.17µs | 0.21µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.20µs | -9.6% | +14.3% ⚠︎ | 0.99µs | 1.33µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | -2.8% | +12.3% ⚠︎ | 0.30µs | 0.38µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.77µs | -7.5% | +5.9% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.84µs | -9.7% | +1.2% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.40µs | -8.2% |  | 70.58µs | 86.70µs | 26 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 476.36µs | -9.6% |  | 447.91µs | 596.48µs | 26 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 523.71µs | -19.0% | -0.2% | 371.23µs | 712.00µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.051ms | -9.4% | +1.6% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.349ms | -16.1% | +2.7% | 4.007ms | 5.183ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.131ms | -4.1% | +0.9% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.052ms | -5.2% | +0.3% | 1.044ms | 1.142ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.703ms | -1.1% | -7.2% | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 100.23µs |  |  | 100.23µs | 100.23µs | 1 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 944.27µs |  |  | 944.27µs | 944.27µs | 1 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 115.889ms |  |  | 115.889ms | 115.889ms | 1 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 4.707ms |  |  | 4.707ms | 4.707ms | 1 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs |  |  | 1.01µs | 1.01µs | 1 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.78µs |  |  | 5.78µs | 5.78µs | 1 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 20.41µs |  |  | 20.41µs | 20.41µs | 1 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.62µs | -4.3% |  | 2.51µs | 3.21µs | 24 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.04µs | -28.1% |  | 10.04µs | 13.96µs | 24 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.38µs | -3.2% |  | 24.32µs | 30.73µs | 24 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 236.18µs | -12.0% |  | 206.12µs | 287.79µs | 24 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.924ms | -24.3% | +11.9% ⚠︎ | 1.549ms | 2.541ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.592ms | -23.0% | +13.9% ⚠︎ | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 177.541ms | -26.2% | +7.8% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 205.37µs |  |  | 199.70µs | 268.00µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 366.59µs |  |  | 353.33µs | 447.38µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.530ms |  |  | 1.495ms | 2.191ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 217.73µs |  |  | 201.20µs | 254.12µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 852.43µs |  |  | 782.83µs | 976.95µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 9.942ms |  |  | 9.942ms | 11.811ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 190.79µs |  |  | 186.53µs | 267.92µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 630.96µs |  |  | 623.82µs | 830.44µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 6.952ms |  |  | 6.362ms | 8.891ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 99.32µs |  |  | 83.88µs | 111.41µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 201.65µs |  |  | 187.52µs | 235.11µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.313ms |  |  | 1.291ms | 1.624ms | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.65µs |  |  | 6.55µs | 7.47µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.53µs |  |  | 14.53µs | 15.90µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 107.75µs |  |  | 105.78µs | 111.59µs | 5 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 199.69µs | -3.0% | -24.8% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 518.89µs | -15.0% | -66.8% ⚠︎ | 518.89µs | 1.812ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.630ms | -64.3% | -82.2% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 201.36µs | -9.1% |  | 178.72µs | 221.60µs | 27 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.647ms | -10.1% |  | 1.531ms | 1.885ms | 27 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 856.94µs | -9.4% |  | 782.04µs | 964.22µs | 27 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.479ms | -15.6% | -10.5% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.492ms | -17.3% | -8.0% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.445ms | -17.6% | -10.3% ⚠︎ | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.393ms | -10.0% | -2.9% | 1.383ms | 1.703ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 869.79µs | -14.3% | -3.3% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.381ms | -14.1% | -4.5% | 1.337ms | 1.756ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.398ms | -13.1% | -0.4% | 1.330ms | 1.612ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 111.55µs | -47.1% | -35.8% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.51µs | -5.6% | +1.6% | 60.09µs | 71.53µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 716.25µs | -16.4% | -5.2% | 693.26µs | 928.53µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 726.49µs | -8.5% | -3.4% | 689.02µs | 1.060ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 749.31µs | -7.4% | -1.6% | 693.05µs | 1.242ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 34.51µs | -21.2% | -6.8% | 34.51µs | 89.26µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 608.87µs | -8.7% | -4.5% | 589.02µs | 765.54µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.09µs | -20.2% | -7.5% | 32.09µs | 80.26µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 612.34µs | -12.6% | -2.8% | 586.81µs | 738.13µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
