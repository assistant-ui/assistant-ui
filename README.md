## aui-perf nightly record

_36 points · 2026-09-03T05:27:14.273Z to 2026-10-08T04:41:14.374Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 627.47µs | -2.7% |  | 592.10µs | 700.65µs | 27 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 719.74µs | +0.2% |  | 665.78µs | 804.46µs | 27 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.16µs | -0.4% | -2.2% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 392.97µs | -0.6% | -4.5% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.075ms | -1.5% | -5.9% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 156.39µs | -2.9% | -11.5% ⚠︎ | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.515ms | +2.3% | -5.6% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.833ms | -3.8% | -8.7% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.82µs | +0.2% | +1.0% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.81µs | -3.2% | +3.4% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 219.69µs | -2.7% | +2.6% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.29µs |  |  | 34.42µs | 40.61µs | 3 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 347.12µs |  |  | 328.87µs | 398.81µs | 3 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.52µs |  |  | 4.27µs | 5.09µs | 3 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 38.15µs |  |  | 35.30µs | 40.83µs | 3 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 528.45µs | -3.9% | -11.1% ⚠︎ | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.796ms | -3.0% | -11.3% ⚠︎ | 4.434ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.081ms | -4.0% | -12.2% ⚠︎ | 17.461ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 331.99µs | -3.9% | -18.6% ⚠︎ | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.087ms | -4.3% | -17.3% ⚠︎ | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.501ms | -3.1% | -18.2% ⚠︎ | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.33µs | +14.3% |  | 23.84µs | 28.78µs | 27 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 307.19µs | +16.4% |  | 249.56µs | 311.76µs | 27 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.673ms | +16.8% |  | 1.384ms | 1.673ms | 27 |
| external-message-conversion › core: external message tool results › 100 matches | 33.84µs | +2.5% |  | 27.25µs | 39.67µs | 27 |
| external-message-conversion › core: external message tool results › 1000 matches | 344.33µs | +1.7% |  | 274.56µs | 404.10µs | 27 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.873ms | +2.6% |  | 1.515ms | 2.169ms | 27 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.54µs | -0.4% |  | 17.93µs | 23.98µs | 27 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 201.71µs | -0.7% |  | 174.51µs | 230.06µs | 27 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.095ms | -3.6% |  | 975.63µs | 1.304ms | 27 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +5.9% | +4.2% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | -2.8% | +3.5% | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.19µs | -1.8% | +8.7% | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -1.8% | -0.1% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.69µs | -1.6% | -0.0% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.87µs | -4.6% | -0.3% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.54µs | +2.7% |  | 70.58µs | 86.70µs | 28 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 468.80µs | -0.8% |  | 447.91µs | 596.48µs | 28 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.018ms |  |  | 1.018ms | 1.222ms | 2 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.371ms |  |  | 1.371ms | 1.499ms | 2 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.336ms |  |  | 7.336ms | 8.816ms | 2 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.670ms |  |  | 8.670ms | 10.017ms | 2 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 502.65µs | -5.8% | -14.9% ⚠︎ | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.052ms | -0.9% | -5.6% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.348ms | +3.1% | -3.6% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.143ms | -0.2% | +0.4% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.052ms | -2.0% | -2.5% | 1.044ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.832ms | -5.5% | +14.7% ⚠︎ | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 118.75µs |  |  | 100.23µs | 152.70µs | 3 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.045ms |  |  | 944.27µs | 1.368ms | 3 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 140.707ms |  |  | 115.889ms | 167.624ms | 3 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.267ms |  |  | 4.707ms | 6.895ms | 3 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs |  |  | 1.01µs | 1.19µs | 3 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.96µs |  |  | 5.76µs | 5.96µs | 3 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 22.73µs |  |  | 17.45µs | 22.73µs | 3 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.57µs | -0.5% |  | 2.51µs | 3.21µs | 26 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.31µs | -12.1% |  | 10.04µs | 13.96µs | 26 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.52µs | +1.4% |  | 24.32µs | 30.73µs | 26 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 223.12µs | -1.7% |  | 206.12µs | 287.79µs | 26 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.842ms | -6.2% | -2.8% | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.904ms | +5.5% | +7.2% | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 193.155ms | -0.8% | +8.0% | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 222.86µs |  |  | 199.70µs | 268.00µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 379.32µs |  |  | 353.33µs | 473.00µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.497ms |  |  | 1.495ms | 2.207ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 217.00µs |  |  | 201.20µs | 283.34µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 815.36µs |  |  | 782.83µs | 976.95µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 11.912ms |  |  | 9.942ms | 12.620ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 187.35µs |  |  | 186.53µs | 267.92µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 644.01µs |  |  | 623.82µs | 830.44µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 7.748ms |  |  | 6.362ms | 10.511ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 100.18µs |  |  | 83.88µs | 111.41µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 184.69µs |  |  | 184.69µs | 235.11µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.226ms |  |  | 1.226ms | 1.624ms | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.63µs |  |  | 6.55µs | 7.89µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.68µs |  |  | 14.53µs | 17.62µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 105.37µs |  |  | 105.37µs | 128.33µs | 7 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 192.82µs | -0.9% | -36.9% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 518.19µs | -4.8% | -65.8% ⚠︎ | 518.19µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.518ms | +5.1% | -86.7% ⚠︎ | 5.537ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 135.50µs |  |  | 135.50µs | 165.76µs | 2 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.269ms |  |  | 1.269ms | 1.471ms | 2 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 626.44µs |  |  | 626.44µs | 745.85µs | 2 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 230.82µs |  |  | 230.82µs | 273.39µs | 2 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.032ms |  |  | 2.032ms | 2.357ms | 2 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.004ms |  |  | 1.004ms | 1.202ms | 2 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 142.03µs |  |  | 142.03µs | 166.92µs | 2 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.776ms |  |  | 12.776ms | 14.005ms | 2 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 330.050ms |  |  | 330.050ms | 360.804ms | 2 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 200.44µs | +0.1% |  | 178.72µs | 242.44µs | 29 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.705ms | +1.5% |  | 1.531ms | 2.003ms | 29 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 879.69µs | -1.1% |  | 782.04µs | 1.028ms | 29 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.502ms | +2.2% | -9.5% | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.534ms | +3.1% | -7.6% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.426ms | +0.9% | -12.4% ⚠︎ | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.430ms | +0.6% | +1.0% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 871.83µs | -3.6% | -5.6% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.389ms | +1.5% | -1.9% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.392ms | +4.7% | -1.9% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 126.33µs | -2.8% | -32.9% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.58µs | -2.5% | -2.9% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 736.92µs | +2.8% | -1.1% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 737.52µs | +1.7% | -20.7% ⚠︎ | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 752.32µs | +2.4% | -27.1% ⚠︎ | 693.05µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 36.46µs | +3.5% | -52.1% ⚠︎ | 34.51µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 602.32µs | -5.0% | -8.4% | 589.02µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.41µs | +3.3% | -52.2% ⚠︎ | 32.09µs | 51.74µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 615.54µs | -1.4% | -8.1% | 586.81µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
