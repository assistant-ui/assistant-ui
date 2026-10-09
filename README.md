## aui-perf nightly record

_37 points · 2026-09-03T05:27:14.273Z to 2026-10-09T04:42:22.724Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 651.41µs | +7.4% |  | 592.10µs | 700.65µs | 28 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 712.13µs | -1.9% |  | 665.78µs | 804.46µs | 28 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.16µs | +4.7% | +5.8% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 390.87µs | +7.3% | +3.9% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.065ms | +7.3% | +3.2% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 160.65µs | +3.3% | -3.8% | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.468ms | +4.5% | -0.7% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.892ms | +3.8% | +0.6% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.02µs | +2.5% | +3.0% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 57.24µs | +3.6% | +6.3% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 225.90µs | +5.0% | +6.1% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.45µs |  |  | 34.42µs | 40.61µs | 4 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 351.90µs |  |  | 328.87µs | 398.81µs | 4 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.43µs |  |  | 4.27µs | 5.09µs | 4 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 36.84µs |  |  | 35.30µs | 40.83µs | 4 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 562.91µs | +9.0% | +11.6% ⚠︎ | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.051ms | +10.3% | +11.8% ⚠︎ | 4.434ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.065ms | +10.2% | +11.8% ⚠︎ | 17.461ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 346.09µs | +9.0% | +3.4% | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.276ms | +13.0% | +6.3% | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.620ms | +11.3% | +1.1% | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.91µs | +12.7% |  | 23.84µs | 28.91µs | 28 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 330.30µs | +28.0% |  | 249.56µs | 330.30µs | 28 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.740ms | +23.9% |  | 1.384ms | 1.740ms | 28 |
| external-message-conversion › core: external message tool results › 100 matches | 34.29µs | -13.5% |  | 27.25µs | 39.67µs | 28 |
| external-message-conversion › core: external message tool results › 1000 matches | 350.59µs | -11.7% |  | 274.56µs | 404.10µs | 28 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.910ms | -12.0% |  | 1.515ms | 2.169ms | 28 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.29µs | -11.2% |  | 17.93µs | 23.98µs | 28 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 209.24µs | -9.0% |  | 174.51µs | 230.06µs | 28 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.142ms | -12.4% |  | 975.63µs | 1.304ms | 28 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -6.5% | -1.7% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +1.2% | +14.3% ⚠︎ | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | +5.2% | +8.1% | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +6.3% | +6.3% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.77µs | -15.7% | +8.7% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.97µs | -17.1% | +9.1% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 77.12µs | -3.4% |  | 70.58µs | 86.70µs | 29 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 487.23µs | -5.2% |  | 447.91µs | 596.48µs | 29 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.076ms |  |  | 1.018ms | 1.222ms | 3 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.391ms |  |  | 1.371ms | 1.499ms | 3 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.155ms |  |  | 7.336ms | 8.816ms | 3 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.574ms |  |  | 8.670ms | 10.017ms | 3 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 553.77µs | -17.8% | +1.1% | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.024ms | -11.7% | -2.3% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.300ms | -2.5% | +1.1% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.129ms | +3.0% | +1.3% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.041ms | -3.8% | -1.9% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.787ms | +25.6% | -5.0% | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 116.75µs |  |  | 100.23µs | 152.70µs | 4 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.064ms |  |  | 944.27µs | 1.368ms | 4 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 135.826ms |  |  | 115.889ms | 167.624ms | 4 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.446ms |  |  | 4.707ms | 6.895ms | 4 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs |  |  | 1.01µs | 1.19µs | 4 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.67µs |  |  | 5.67µs | 5.96µs | 4 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 19.67µs |  |  | 17.45µs | 22.73µs | 4 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.66µs | -17.2% |  | 2.51µs | 3.21µs | 27 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.65µs | -14.7% |  | 10.04µs | 13.96µs | 27 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.37µs | -17.4% |  | 24.32µs | 30.73µs | 27 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 232.29µs | -19.3% |  | 206.12µs | 287.79µs | 27 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.175ms | +5.2% | +11.8% ⚠︎ | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.727ms | +9.2% | +19.4% ⚠︎ | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 196.137ms | +22.1% | +4.4% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 242.05µs | -9.7% |  | 199.70µs | 268.00µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 437.27µs | -2.3% |  | 353.33µs | 473.00µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.639ms | -25.2% |  | 1.495ms | 2.207ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 233.52µs | -8.1% |  | 201.20µs | 283.34µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 842.59µs | -13.8% |  | 782.83µs | 976.95µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 10.700ms | -9.4% |  | 9.942ms | 12.620ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 221.93µs | -17.2% |  | 186.53µs | 267.92µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 669.46µs | -19.4% |  | 623.82µs | 830.44µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 6.797ms | -23.6% |  | 6.362ms | 10.511ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 104.02µs | +0.7% |  | 83.88µs | 111.41µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 221.21µs | -5.9% |  | 184.69µs | 235.11µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.478ms | -9.0% |  | 1.226ms | 1.624ms | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.07µs | -5.4% |  | 6.55µs | 7.89µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 16.05µs | +1.0% |  | 14.53µs | 17.62µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 116.94µs | +10.1% |  | 105.37µs | 128.33µs | 8 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 203.93µs | -3.5% | -39.6% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 588.99µs | -8.4% | -65.4% ⚠︎ | 518.19µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.693ms | -0.2% | -81.9% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 144.30µs |  |  | 135.50µs | 165.76µs | 3 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.290ms |  |  | 1.269ms | 1.471ms | 3 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 649.43µs |  |  | 626.44µs | 745.85µs | 3 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 235.30µs |  |  | 230.82µs | 273.39µs | 3 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.077ms |  |  | 2.032ms | 2.357ms | 3 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.040ms |  |  | 1.004ms | 1.202ms | 3 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 148.98µs |  |  | 142.03µs | 166.92µs | 3 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.978ms |  |  | 12.776ms | 14.005ms | 3 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 321.746ms |  |  | 321.746ms | 360.804ms | 3 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 212.50µs | +14.8% |  | 178.72µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.783ms | +14.1% |  | 1.531ms | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 892.32µs | +9.1% |  | 782.04µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.602ms | +2.1% | -5.0% | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.635ms | +2.3% | -1.3% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.581ms | +4.1% | -4.0% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.490ms | +1.4% | +5.2% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 938.79µs | -4.8% | +2.0% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.459ms | +4.0% | +5.2% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.461ms | +5.0% | +5.4% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 114.96µs | +0.1% | -36.8% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.83µs | -1.7% | +2.2% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 771.00µs | +6.5% | +5.4% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 803.99µs | -0.9% | +15.8% ⚠︎ | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 818.82µs | -1.5% | +16.3% ⚠︎ | 693.05µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.56µs | -0.9% | +1.5% | 34.51µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 680.57µs | +1.4% | +14.1% ⚠︎ | 589.02µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.32µs | +1.9% | +1.9% | 32.09µs | 51.74µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 661.83µs | +6.1% | +12.8% ⚠︎ | 593.79µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
