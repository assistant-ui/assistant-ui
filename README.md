## aui-perf nightly record

_39 points · 2026-09-03T05:27:14.273Z to 2026-10-11T04:40:55.506Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 603.74µs | +1.9% |  | 592.10µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 680.87µs | -3.0% |  | 665.78µs | 804.46µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.96µs | -4.0% | -1.1% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 368.01µs | -3.2% | -1.2% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.761ms | -1.6% | -0.1% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 153.84µs | -4.4% | -5.7% | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.420ms | -2.8% | -1.8% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.696ms | -3.2% | -0.5% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.55µs | -3.6% | -0.9% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.52µs | +0.4% | -0.6% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 209.79µs | -0.5% | -0.7% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.64µs |  |  | 34.14µs | 40.61µs | 6 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 347.63µs |  |  | 328.87µs | 398.81µs | 6 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.60µs |  |  | 4.27µs | 5.09µs | 6 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 37.54µs |  |  | 35.19µs | 40.83µs | 6 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 519.81µs | -6.1% | +4.5% | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.705ms | -5.7% | +3.4% | 4.434ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.725ms | -4.8% | +4.7% | 17.461ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 336.32µs | +1.9% | -1.5% | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.100ms | +0.9% | +0.8% | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.343ms | -0.9% | +1.5% | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.83µs | +12.3% |  | 23.84µs | 28.91µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 307.02µs | +15.2% |  | 249.56µs | 330.30µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.667ms | +17.4% |  | 1.384ms | 1.740ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 33.22µs | -1.8% |  | 27.25µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 340.70µs | -0.3% |  | 274.56µs | 404.10µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.875ms | +1.0% |  | 1.515ms | 2.169ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.03µs | +0.2% |  | 17.93µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 200.81µs | +3.2% |  | 174.51µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.075ms | +3.0% |  | 975.63µs | 1.304ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -0.9% | -6.3% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +2.9% | +7.4% | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.16µs | -3.8% | +7.4% | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | -2.9% | -0.6% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.67µs | -7.9% | +1.7% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.89µs | -6.8% | +0.3% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.35µs | -4.0% | -6.0% | 70.58µs | 86.70µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 477.61µs | -1.9% | -0.4% | 447.91µs | 596.48µs | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.025ms |  |  | 1.018ms | 1.222ms | 5 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.392ms |  |  | 1.371ms | 1.499ms | 5 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.384ms |  |  | 7.336ms | 8.816ms | 5 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.727ms |  |  | 8.670ms | 10.017ms | 5 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 503.15µs | -1.8% | -12.0% ⚠︎ | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.033ms | -2.8% | -1.8% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.127ms | -5.6% | -3.8% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.119ms | -1.4% | +2.0% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.058ms | -2.8% | -1.1% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.773ms | +0.9% | +5.7% | 2.210ms | 3.478ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 116.20µs |  |  | 100.23µs | 152.70µs | 6 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.051ms |  |  | 944.27µs | 1.368ms | 6 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 157.688ms |  |  | 115.889ms | 167.624ms | 6 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.205ms |  |  | 4.707ms | 6.895ms | 6 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 0.99µs |  |  | 0.99µs | 1.19µs | 6 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.63µs |  |  | 5.63µs | 5.96µs | 6 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 19.64µs |  |  | 17.45µs | 22.73µs | 6 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.59µs | -3.3% |  | 2.51µs | 3.21µs | 29 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.74µs | -7.4% |  | 10.04µs | 13.96µs | 29 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.71µs | -4.1% |  | 24.32µs | 30.73µs | 29 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 231.24µs | +2.6% |  | 206.12µs | 287.79µs | 29 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.007ms | -0.9% | +6.6% | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.252ms | +0.2% | +12.7% ⚠︎ | 11.419ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 208.916ms | +5.4% | +15.4% ⚠︎ | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 197.56µs | -12.6% |  | 197.56µs | 268.00µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 327.73µs | -13.9% |  | 327.73µs | 473.00µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.584ms | +1.2% |  | 1.495ms | 2.207ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 187.05µs | -10.4% |  | 187.05µs | 283.34µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 532.91µs | -31.9% |  | 528.14µs | 976.95µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.475ms | -62.0% |  | 4.475ms | 12.620ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 171.55µs | -8.4% |  | 171.55µs | 267.92µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 385.75µs | -38.2% |  | 385.75µs | 830.44µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.784ms | -61.2% |  | 2.630ms | 10.511ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 93.41µs | -16.2% |  | 83.88µs | 111.41µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 185.96µs | -7.0% |  | 184.69µs | 235.11µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.239ms | -11.0% |  | 1.226ms | 1.624ms | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.68µs | -6.7% |  | 6.55µs | 7.89µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.21µs | -2.9% |  | 14.21µs | 17.62µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 103.44µs | -7.3% |  | 103.44µs | 128.33µs | 10 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 185.74µs | -11.6% | -44.8% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 374.00µs | -33.8% | -78.2% ⚠︎ | 374.00µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.734ms | -56.9% | -94.5% ⚠︎ | 2.734ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 140.76µs |  |  | 135.50µs | 165.76µs | 5 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.264ms |  |  | 1.226ms | 1.471ms | 5 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 638.60µs |  |  | 620.33µs | 745.85µs | 5 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 233.64µs |  |  | 229.48µs | 273.39µs | 5 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.042ms |  |  | 1.988ms | 2.357ms | 5 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.032ms |  |  | 1.004ms | 1.202ms | 5 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 146.95µs |  |  | 142.03µs | 166.92µs | 5 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.546ms |  |  | 12.439ms | 14.005ms | 5 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 319.816ms |  |  | 314.308ms | 360.804ms | 5 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 208.28µs | -1.3% | +2.5% | 178.72µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.716ms | -2.4% | +2.2% | 1.531ms | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 888.95µs | -2.7% | +2.4% | 782.04µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.499ms | -1.5% | -9.2% | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.516ms | +1.0% | -9.0% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.448ms | +0.1% | -8.0% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.407ms | -1.1% | +0.3% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 885.64µs | -2.4% | -0.4% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.368ms | -0.1% | -8.3% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.330ms | -2.5% | -6.9% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 114.59µs | -9.1% | -37.7% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.68µs | -0.1% | -1.2% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 718.95µs | +1.3% | -7.1% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 730.25µs | -5.1% | +1.8% | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 740.02µs | -7.0% | +1.9% | 693.05µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 20.95µs | -43.3% | -42.0% ⚠︎ | 20.95µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.26µs | -96.6% | -96.5% ⚠︎ | 21.26µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.48µs | +1.0% | +0.5% | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 646.69µs | +3.7% | +8.5% | 593.79µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
