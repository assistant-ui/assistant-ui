## aui-perf nightly record

_35 points · 2026-09-03T05:27:14.273Z to 2026-10-07T04:41:14.467Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 700.65µs | +10.7% |  | 592.10µs | 700.65µs | 26 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 804.46µs | +12.6% |  | 665.78µs | 804.46µs | 26 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 39.98µs | +19.6% | -5.0% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 444.94µs | +19.3% | -5.7% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.875ms | +17.5% | -6.9% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 185.70µs | +19.5% | -11.1% ⚠︎ | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.707ms | +16.6% | -10.0% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.838ms | +18.7% | -9.3% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.88µs | +17.0% | +2.9% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 61.40µs | +9.6% | +2.8% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 246.32µs | +11.8% | +4.4% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 40.61µs |  |  | 34.42µs | 40.61µs | 2 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 398.81µs |  |  | 328.87µs | 398.81µs | 2 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.09µs |  |  | 4.27µs | 5.09µs | 2 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 40.83µs |  |  | 35.30µs | 40.83µs | 2 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 624.45µs | +15.7% | -4.5% | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.608ms | +14.5% | -7.7% | 4.434ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 22.665ms | +17.4% | -5.7% | 17.461ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 389.68µs | +17.5% | -21.3% ⚠︎ | 291.94µs | 408.03µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.666ms | +19.3% | -15.0% ⚠︎ | 2.715ms | 3.733ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 14.951ms | +21.1% | -13.5% ⚠︎ | 10.803ms | 15.282ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.78µs | +13.3% |  | 23.84µs | 28.78µs | 26 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 311.76µs | +13.6% |  | 249.56µs | 311.76µs | 26 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.659ms | +11.5% |  | 1.384ms | 1.659ms | 26 |
| external-message-conversion › core: external message tool results › 100 matches | 38.50µs | +12.3% |  | 27.25µs | 39.67µs | 26 |
| external-message-conversion › core: external message tool results › 1000 matches | 404.10µs | +14.9% |  | 274.56µs | 404.10µs | 26 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.154ms | +12.0% |  | 1.515ms | 2.169ms | 26 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 22.88µs | +12.8% |  | 17.93µs | 23.98µs | 26 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 224.67µs | +10.8% |  | 174.51µs | 230.06µs | 26 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.252ms | +14.1% |  | 975.63µs | 1.304ms | 26 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +19.7% | +0.9% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.22µs | +19.4% | +8.1% | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.40µs | +18.7% | +15.9% ⚠︎ | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.41µs | +24.7% | +6.4% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.07µs | +19.0% | +4.9% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 18.44µs | +17.6% | +8.6% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 86.24µs | +17.5% |  | 70.58µs | 86.70µs | 27 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 565.81µs | +23.7% |  | 447.91µs | 596.48µs | 27 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.222ms |  |  | 1.222ms | 1.222ms | 1 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.499ms |  |  | 1.499ms | 1.499ms | 1 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.816ms |  |  | 8.816ms | 8.816ms | 1 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.017ms |  |  | 10.017ms | 10.017ms | 1 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 730.11µs | +31.7% | +2.5% | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.212ms | +13.4% | -0.1% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.227ms | +17.9% | +2.4% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.123ms | +0.8% | -0.3% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.178ms | +10.8% | +3.2% | 1.044ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.531ms | -5.6% | +1.4% | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 152.70µs |  |  | 100.23µs | 152.70µs | 2 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.368ms |  |  | 944.27µs | 1.368ms | 2 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 167.624ms |  |  | 115.889ms | 167.624ms | 2 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.895ms |  |  | 4.707ms | 6.895ms | 2 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.19µs |  |  | 1.01µs | 1.19µs | 2 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.76µs |  |  | 5.76µs | 5.78µs | 2 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.45µs |  |  | 17.45µs | 20.41µs | 2 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.05µs | +20.8% |  | 2.51µs | 3.21µs | 25 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.60µs | +4.5% |  | 10.04µs | 13.96µs | 25 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 29.05µs | +18.8% |  | 24.32µs | 30.73µs | 25 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 259.66µs | +15.0% |  | 206.12µs | 287.79µs | 25 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.615ms | +28.7% | +13.2% ⚠︎ | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.034ms | +15.1% | +10.0% ⚠︎ | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 224.183ms | +19.6% | +2.0% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 241.53µs |  |  | 199.70µs | 268.00µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 473.00µs |  |  | 353.33µs | 473.00µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.207ms |  |  | 1.495ms | 2.207ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 283.34µs |  |  | 201.20µs | 283.34µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 954.53µs |  |  | 782.83µs | 976.95µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 12.620ms |  |  | 9.942ms | 12.620ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 225.45µs |  |  | 186.53µs | 267.92µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 742.82µs |  |  | 623.82µs | 830.44µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 10.511ms |  |  | 6.362ms | 10.511ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 111.36µs |  |  | 83.88µs | 111.41µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 233.02µs |  |  | 187.52µs | 235.11µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.601ms |  |  | 1.291ms | 1.624ms | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.89µs |  |  | 6.55µs | 7.89µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 17.62µs |  |  | 14.53µs | 17.62µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 128.33µs |  |  | 105.78µs | 128.33µs | 6 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 244.80µs | +27.1% | -26.2% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 631.37µs | +19.4% | -65.1% ⚠︎ | 518.89µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.621ms | +12.0% | -82.9% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 165.76µs |  |  | 165.76µs | 165.76µs | 1 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.471ms |  |  | 1.471ms | 1.471ms | 1 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 745.85µs |  |  | 745.85µs | 745.85µs | 1 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 273.39µs |  |  | 273.39µs | 273.39µs | 1 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.357ms |  |  | 2.357ms | 2.357ms | 1 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.202ms |  |  | 1.202ms | 1.202ms | 1 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 166.92µs |  |  | 166.92µs | 166.92µs | 1 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 14.005ms |  |  | 14.005ms | 14.005ms | 1 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 360.804ms |  |  | 360.804ms | 360.804ms | 1 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 242.44µs | +22.1% |  | 178.72µs | 242.44µs | 28 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 2.003ms | +20.8% |  | 1.531ms | 2.003ms | 28 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 1.028ms | +19.8% |  | 782.04µs | 1.028ms | 28 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.748ms | +5.9% | -13.1% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.768ms | +4.8% | -12.3% ⚠︎ | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.675ms | +5.3% | -13.1% ⚠︎ | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.733ms | +19.3% | +1.8% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.023ms | +6.9% | -3.1% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.593ms | +4.9% | -9.3% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.604ms | +10.3% | -0.5% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 137.69µs | -23.9% | -30.8% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 73.56µs | +19.3% | +2.8% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 829.17µs | +3.2% | -10.7% ⚠︎ | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 876.92µs | +22.9% | -17.3% ⚠︎ | 689.02µs | 929.85µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 902.68µs | +25.4% | -27.3% ⚠︎ | 693.05µs | 1.032ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 40.71µs | +11.3% | -54.4% ⚠︎ | 34.51µs | 76.11µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 705.55µs | +18.1% | -7.8% | 589.02µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.12µs | +8.2% | -53.8% ⚠︎ | 32.09µs | 69.86µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 716.76µs | +17.5% | -2.9% | 586.81µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
