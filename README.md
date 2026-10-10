## aui-perf nightly record

_38 points · 2026-09-03T05:27:14.273Z to 2026-10-10T04:39:38.673Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 629.48µs | +3.8% |  | 592.10µs | 700.65µs | 29 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 697.34µs | -3.9% |  | 665.78µs | 804.46µs | 29 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.29µs | -0.9% | -2.6% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 373.25µs | +2.5% | -0.3% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.859ms | +3.7% | +0.4% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 158.07µs | +1.6% | -0.6% | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.450ms | +3.2% | -0.8% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.799ms | +2.1% | -0.5% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.89µs | +0.6% | +4.7% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 56.10µs | +1.5% | +5.2% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 221.32µs | +2.9% | +5.3% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 34.14µs |  |  | 34.14µs | 40.61µs | 5 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 339.55µs |  |  | 328.87µs | 398.81µs | 5 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.30µs |  |  | 4.27µs | 5.09µs | 5 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.19µs |  |  | 35.19µs | 40.83µs | 5 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 527.10µs | +2.1% | +4.6% | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.783ms | +4.5% | +4.5% | 4.434ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.919ms | +3.9% | +2.2% | 17.461ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 333.78µs | +5.1% | +1.0% | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.029ms | +4.5% | -0.6% | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.133ms | +7.0% | -2.0% | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.71µs | +11.9% |  | 23.84µs | 28.91µs | 29 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 314.81µs | +22.0% |  | 249.56µs | 330.30µs | 29 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.680ms | +19.6% |  | 1.384ms | 1.740ms | 29 |
| external-message-conversion › core: external message tool results › 100 matches | 33.61µs | -15.3% |  | 27.25µs | 39.67µs | 29 |
| external-message-conversion › core: external message tool results › 1000 matches | 348.73µs | -12.1% |  | 274.56µs | 404.10µs | 29 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.847ms | -14.9% |  | 1.515ms | 2.169ms | 29 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.52µs | -14.4% |  | 17.93µs | 23.98µs | 29 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 200.16µs | -13.0% |  | 174.51µs | 230.06µs | 29 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.106ms | -15.2% |  | 975.63µs | 1.304ms | 29 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -8.1% | -3.6% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -2.9% | +10.2% ⚠︎ | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.21µs | +5.5% | +10.9% ⚠︎ | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | +6.7% | +4.0% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.82µs | -13.4% | +12.9% ⚠︎ | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.22µs | -15.8% | +13.0% ⚠︎ | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.48µs | -7.9% |  | 70.58µs | 86.70µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 465.80µs | -9.4% |  | 447.91µs | 596.48µs | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.070ms |  |  | 1.018ms | 1.222ms | 4 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.383ms |  |  | 1.371ms | 1.499ms | 4 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.806ms |  |  | 7.336ms | 8.816ms | 4 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.036ms |  |  | 8.670ms | 10.017ms | 4 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 587.11µs | -12.9% | +7.5% | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.074ms | -7.4% | +2.2% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.297ms | -2.6% | +0.8% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.146ms | +4.6% | +2.3% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.059ms | -2.1% | -0.3% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.829ms | +27.5% | +12.1% ⚠︎ | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 117.76µs |  |  | 100.23µs | 152.70µs | 5 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.055ms |  |  | 944.27µs | 1.368ms | 5 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 154.185ms |  |  | 115.889ms | 167.624ms | 5 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.134ms |  |  | 4.707ms | 6.895ms | 5 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.03µs |  |  | 1.01µs | 1.19µs | 5 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.82µs |  |  | 5.67µs | 5.96µs | 5 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 21.21µs |  |  | 17.45µs | 22.73µs | 5 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.63µs | -18.2% |  | 2.51µs | 3.21µs | 28 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.07µs | -11.3% |  | 10.04µs | 13.96µs | 28 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.89µs | -19.0% |  | 24.32µs | 30.73µs | 28 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 239.20µs | -16.9% |  | 206.12µs | 287.79µs | 28 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.060ms | -0.4% | +14.0% ⚠︎ | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.637ms | +8.5% | +15.5% ⚠︎ | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 216.106ms | +34.5% | +18.9% ⚠︎ | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 206.89µs | -22.8% |  | 199.70µs | 268.00µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 343.10µs | -23.3% |  | 343.10µs | 473.00µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.619ms | -26.1% |  | 1.495ms | 2.207ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 193.20µs | -24.0% |  | 193.20µs | 283.34µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 528.14µs | -45.9% |  | 528.14µs | 976.95µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.166ms | -56.3% |  | 5.166ms | 12.620ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 182.82µs | -31.8% |  | 182.82µs | 267.92µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 398.13µs | -52.1% |  | 398.13µs | 830.44µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.630ms | -70.4% |  | 2.630ms | 10.511ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 91.12µs | -11.8% |  | 83.88µs | 111.41µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 191.99µs | -18.3% |  | 184.69µs | 235.11µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.311ms | -19.3% |  | 1.226ms | 1.624ms | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.59µs | -11.8% |  | 6.55µs | 7.89µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.81µs | -6.9% |  | 14.53µs | 17.62µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 105.81µs | -0.4% |  | 105.37µs | 128.33µs | 9 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 198.49µs | -6.1% | -34.7% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 401.68µs | -37.6% | -74.3% ⚠︎ | 401.68µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.034ms | -60.7% | -92.8% ⚠︎ | 3.034ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 137.13µs |  |  | 135.50µs | 165.76µs | 4 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.226ms |  |  | 1.226ms | 1.471ms | 4 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 620.33µs |  |  | 620.33µs | 745.85µs | 4 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 229.48µs |  |  | 229.48µs | 273.39µs | 4 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.988ms |  |  | 1.988ms | 2.357ms | 4 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.011ms |  |  | 1.004ms | 1.202ms | 4 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 143.99µs |  |  | 142.03µs | 166.92µs | 4 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.439ms |  |  | 12.439ms | 14.005ms | 4 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 314.308ms |  |  | 314.308ms | 360.804ms | 4 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 201.86µs | +9.1% | +0.5% | 178.72µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.672ms | +7.0% | -2.0% | 1.531ms | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 873.57µs | +6.8% | +0.1% | 782.04µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.515ms | -3.4% | -13.2% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.512ms | -5.4% | -3.0% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.447ms | -4.7% | -3.3% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.434ms | -2.4% | +1.9% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 879.91µs | -10.8% | -3.8% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.433ms | +2.2% | -1.5% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.392ms | +0.0% | -4.2% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 118.00µs | +2.8% | -37.6% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.79µs | -3.3% | +1.3% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 737.34µs | +1.8% | -1.3% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 746.73µs | -7.9% | -2.5% | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 760.78µs | -8.5% | -5.1% | 693.05µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.55µs | -41.6% | -46.0% ⚠︎ | 21.55µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.72µs | -96.8% | -96.6% ⚠︎ | 21.72µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.70µs | +3.1% | -32.9% ⚠︎ | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 664.21µs | +6.5% | +4.8% | 593.79µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
