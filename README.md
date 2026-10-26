## aui-perf nightly record

_54 points · 2026-09-03T05:27:14.273Z to 2026-10-26T04:42:05.928Z · latest runner: AMD EPYC · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 501.09µs | -0.8% | -18.2% ⚠︎ | 464.56µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 583.83µs | -2.7% | -15.2% ⚠︎ | 538.74µs | 808.41µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 27.78µs | +0.1% | -18.8% ⚠︎ | 24.88µs | 40.75µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 325.15µs | -0.1% | -12.6% ⚠︎ | 291.86µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.029ms | -1.2% | -10.7% ⚠︎ | 4.560ms | 6.892ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 135.50µs | -0.7% | -11.9% ⚠︎ | 120.80µs | 190.46µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.244ms | -1.8% | -9.5% | 1.125ms | 1.714ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.979ms | -1.4% | -10.6% ⚠︎ | 4.477ms | 6.879ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.32µs | -1.7% | -21.9% ⚠︎ | 4.79µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 42.34µs | -0.1% | -22.0% ⚠︎ | 39.16µs | 61.59µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 162.51µs | -0.9% | -20.7% ⚠︎ | 155.39µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 40.28µs | +8.7% |  | 33.46µs | 46.67µs | 21 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 370.21µs | +4.4% |  | 318.63µs | 414.32µs | 21 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.22µs | +6.0% |  | 4.23µs | 5.62µs | 21 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 43.93µs | +14.4% |  | 35.19µs | 48.58µs | 21 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 344.58µs | -0.9% | -32.5% ⚠︎ | 309.68µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.051ms | -0.8% | -32.0% ⚠︎ | 2.594ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 12.101ms | -0.5% | -31.8% ⚠︎ | 10.242ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 185.89µs | -3.6% | -37.9% ⚠︎ | 163.70µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.741ms | -4.0% | -37.4% ⚠︎ | 1.512ms | 3.666ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.826ms | -4.4% | -37.6% ⚠︎ | 5.816ms | 15.002ms | 30 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 121.12µs |  |  | 106.15µs | 128.89µs | 4 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 876.99µs |  |  | 758.99µs | 876.99µs | 4 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.46µs | -0.9% | +11.3% ⚠︎ | 23.95µs | 32.33µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 333.41µs | +0.6% | +27.0% ⚠︎ | 256.80µs | 364.42µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.785ms | -1.2% | +26.0% ⚠︎ | 1.400ms | 1.971ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 35.52µs | +2.3% | -9.4% | 32.24µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 364.51µs | +2.5% | -7.4% | 330.50µs | 404.95µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.970ms | +0.7% | -9.1% | 1.792ms | 2.193ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.10µs | -0.0% | -9.4% | 19.18µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 202.28µs | -1.1% | -10.1% ⚠︎ | 185.12µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.136ms | -2.0% | -12.3% ⚠︎ | 1.029ms | 1.317ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -4.8% | +0.6% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | -0.6% | +4.9% | 0.19µs | 0.23µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.27µs | +0.0% | +13.9% ⚠︎ | 1.10µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.38µs | +1.7% | +18.4% ⚠︎ | 0.32µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.93µs | +3.8% | -4.4% | 1.65µs | 2.14µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.93µs | +1.4% | -7.7% | 14.82µs | 19.98µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 81.24µs | +9.8% | +3.7% | 70.88µs | 92.09µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 481.03µs | -0.7% | -3.1% | 447.91µs | 595.73µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.195ms | -0.4% |  | 1.133ms | 1.774ms | 15 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 105.72µs | +0.1% |  | 94.56µs | 118.57µs | 14 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.513ms | +0.2% |  | 1.434ms | 2.024ms | 15 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 223.14µs | -0.8% |  | 214.45µs | 246.18µs | 15 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 326.51µs | -1.6% |  | 295.45µs | 373.70µs | 15 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.189ms | +4.3% |  | 2.767ms | 4.523ms | 15 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 499.41µs | +0.5% |  | 410.62µs | 542.42µs | 14 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.127ms | +0.6% |  | 9.361ms | 12.361ms | 15 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.578ms | +0.5% |  | 1.500ms | 1.748ms | 15 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.174ms | -0.0% |  | 1.048ms | 1.303ms | 15 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.094ms | -2.1% |  | 1.018ms | 1.222ms | 20 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.419ms | -1.4% |  | 1.371ms | 1.548ms | 20 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.854ms | -0.5% |  | 7.336ms | 8.816ms | 20 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.208ms | -1.0% |  | 8.611ms | 10.017ms | 20 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 635.48µs | +2.4% | -1.0% | 502.65µs | 787.07µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.117ms | +0.5% | -2.1% | 1.019ms | 1.251ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.548ms | -0.6% | +2.7% | 4.065ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.129ms | +0.7% | +0.9% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.073ms | -1.3% | -1.3% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.324ms | -10.0% | +5.2% | 2.219ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 147.76µs | +8.6% |  | 100.23µs | 161.14µs | 21 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.407ms | +11.7% |  | 944.27µs | 1.503ms | 21 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 146.955ms | -8.8% |  | 115.889ms | 170.961ms | 21 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 7.131ms | +10.4% |  | 4.707ms | 7.499ms | 21 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.11µs | +1.1% |  | 0.99µs | 1.19µs | 21 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.25µs | -0.1% |  | 5.25µs | 6.41µs | 21 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 15.71µs | -1.4% |  | 15.71µs | 29.41µs | 21 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.82µs | +1.2% | -9.0% | 2.51µs | 3.44µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.99µs | -0.2% | -10.5% ⚠︎ | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.57µs | -0.3% | -12.0% ⚠︎ | 24.16µs | 32.20µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 247.02µs | -0.8% | -13.2% ⚠︎ | 223.12µs | 322.31µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.583ms | +4.2% | +28.2% ⚠︎ | 1.829ms | 2.989ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 17.923ms | +3.9% | +46.4% ⚠︎ | 11.705ms | 18.409ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 243.551ms | -4.2% | +52.9% ⚠︎ | 160.683ms | 290.378ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 211.86µs | +0.6% |  | 191.63µs | 268.00µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 380.99µs | +10.7% |  | 314.68µs | 473.00µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.003ms | +3.5% |  | 1.495ms | 2.207ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 212.36µs | +0.8% |  | 185.62µs | 283.34µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 607.99µs | -0.2% |  | 526.75µs | 976.95µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.348ms | +2.3% |  | 4.475ms | 12.620ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 193.19µs | -0.9% |  | 171.55µs | 267.92µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 400.01µs | -4.3% |  | 371.58µs | 830.44µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.126ms | +2.7% |  | 2.630ms | 10.511ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 99.50µs | -2.4% |  | 83.88µs | 128.35µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 211.44µs | +2.2% |  | 184.69µs | 261.67µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.428ms | -7.2% |  | 1.226ms | 1.890ms | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.90µs | +0.8% |  | 6.55µs | 8.68µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 19.08µs | -0.0% |  | 14.21µs | 20.91µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 157.46µs | +4.3% |  | 102.78µs | 175.47µs | 25 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 228.53µs | -2.7% | +4.5% | 176.71µs | 267.49µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 410.25µs | +5.7% | -33.5% ⚠︎ | 360.32µs | 643.26µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.999ms | -11.9% | -57.4% ⚠︎ | 2.568ms | 18.547ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 124.92µs | -1.9% |  | 112.48µs | 165.76µs | 20 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.150ms | +0.7% |  | 1.019ms | 1.471ms | 20 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 572.71µs | -1.5% |  | 512.64µs | 745.85µs | 20 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 150.37µs | -0.6% |  | 135.32µs | 273.39µs | 20 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.339ms | -0.6% |  | 1.205ms | 2.357ms | 20 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 675.65µs | -1.8% |  | 612.98µs | 1.202ms | 20 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 147.66µs | -1.1% |  | 135.97µs | 188.74µs | 20 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.152ms | +4.3% |  | 11.650ms | 14.005ms | 20 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 326.772ms | -0.6% |  | 304.987ms | 638.209ms | 20 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 119.40µs | -1.9% | -35.2% ⚠︎ | 102.17µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.005ms | -1.3% | -34.9% ⚠︎ | 864.16µs | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 531.99µs | +2.3% | -34.5% ⚠︎ | 438.95µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.572ms | -3.3% | -4.9% | 1.470ms | 1.959ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.543ms | -1.5% | -10.6% ⚠︎ | 1.488ms | 1.870ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.519ms | +1.1% | -8.0% | 1.414ms | 1.821ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.515ms | -1.3% | +5.8% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 925.41µs | -2.9% | -10.0% ⚠︎ | 826.58µs | 1.048ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.446ms | -4.6% | -6.5% | 1.309ms | 1.679ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.417ms | -5.1% | -6.2% | 1.307ms | 1.630ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 126.27µs | +1.3% | -33.5% ⚠︎ | 110.42µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 66.98µs | +0.1% | +5.9% | 60.96µs | 74.62µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 741.14µs | -5.6% | -9.6% | 689.25µs | 860.28µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 803.43µs | +0.7% | +4.1% | 708.46µs | 905.34µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 806.58µs | -0.3% | -1.1% | 715.74µs | 946.43µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.23µs | -1.3% | -39.0% ⚠︎ | 20.86µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.37µs | -2.2% | -96.6% ⚠︎ | 21.05µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.27µs | -2.3% | -1.1% | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 645.63µs | +0.9% | +1.1% | 587.81µs | 738.84µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
