## aui-perf nightly record

_44 points · 2026-09-03T05:27:14.273Z to 2026-10-16T04:37:19.829Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 529.22µs | -15.7% | -12.0% ⚠︎ | 482.81µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 652.13µs | -9.4% | -2.9% | 567.13µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 31.12µs | -11.5% | -5.0% | 26.09µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 357.60µs | -9.0% | -3.2% | 300.46µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.574ms | -8.2% | -3.1% | 4.704ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 148.65µs | -5.0% | -3.6% | 124.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.381ms | -8.8% | -3.1% | 1.156ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.531ms | -5.2% | -2.4% | 4.622ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.68µs | -16.6% | -13.5% ⚠︎ | 4.97µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 45.82µs | -17.9% | -13.6% ⚠︎ | 40.73µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 177.58µs | -19.2% | -14.9% ⚠︎ | 161.58µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 43.69µs | +23.8% |  | 34.14µs | 44.86µs | 11 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 402.67µs | +16.0% |  | 328.87µs | 414.32µs | 11 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.49µs | +21.5% |  | 4.27µs | 5.49µs | 11 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 43.92µs | +15.1% |  | 35.19µs | 45.55µs | 11 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 385.63µs | -27.0% | -21.5% ⚠︎ | 319.33µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.357ms | -30.0% | -25.8% ⚠︎ | 2.810ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 13.419ms | -29.7% | -26.0% ⚠︎ | 11.122ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 227.57µs | -31.5% | -30.9% ⚠︎ | 180.10µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.071ms | -32.9% | -35.1% ⚠︎ | 1.708ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.021ms | -35.8% | -36.1% ⚠︎ | 6.701ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 31.89µs | +12.6% | +32.8% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 354.18µs | +15.3% | +37.6% ⚠︎ | 249.56µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.949ms | +16.4% | +40.0% ⚠︎ | 1.386ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 37.90µs | +12.0% | +39.1% ⚠︎ | 27.63µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 382.50µs | +11.1% | +39.3% ⚠︎ | 281.17µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.111ms | +12.7% | +36.5% ⚠︎ | 1.524ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 22.57µs | +9.9% | +20.4% ⚠︎ | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 220.98µs | +9.6% | +25.4% ⚠︎ | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.249ms | +14.0% | +25.1% ⚠︎ | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +13.0% | +25.4% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.23µs | +20.7% | +32.8% ⚠︎ | 0.17µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.35µs | +13.2% | +30.0% ⚠︎ | 0.99µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.40µs | +19.1% | +21.0% ⚠︎ | 0.30µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.95µs | +15.8% | +22.0% ⚠︎ | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.30µs | +16.4% | +22.8% ⚠︎ | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 89.15µs | +18.0% | +22.6% ⚠︎ | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 566.26µs | +20.8% | +25.1% ⚠︎ | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.291ms |  |  | 1.152ms | 1.495ms | 5 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 116.15µs |  |  | 97.28µs | 118.57µs | 4 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.631ms |  |  | 1.450ms | 1.686ms | 5 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 246.17µs |  |  | 216.72µs | 246.18µs | 5 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 362.57µs |  |  | 295.45µs | 369.60µs | 5 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.283ms |  |  | 3.030ms | 3.283ms | 5 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 529.40µs |  |  | 460.02µs | 529.40µs | 4 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.996ms |  |  | 9.408ms | 11.266ms | 5 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.722ms |  |  | 1.500ms | 1.748ms | 5 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.260ms |  |  | 1.048ms | 1.303ms | 5 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.174ms | +15.3% |  | 1.018ms | 1.222ms | 10 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.472ms | +7.3% |  | 1.371ms | 1.499ms | 10 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.317ms | +13.4% |  | 7.336ms | 8.816ms | 10 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.678ms | +11.6% |  | 8.670ms | 10.017ms | 10 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 718.69µs | +43.0% | +79.5% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.223ms | +16.2% | +14.5% ⚠︎ | 1.021ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.004ms | +15.1% | +23.1% ⚠︎ | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.116ms | -2.3% | -1.4% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.160ms | +10.3% | +9.7% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.520ms | -11.0% | -13.1% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 139.90µs | +17.8% |  | 100.23µs | 152.70µs | 11 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.293ms | +23.7% |  | 944.27µs | 1.409ms | 11 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 168.160ms | +19.5% |  | 115.889ms | 170.961ms | 11 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.601ms | +25.3% |  | 4.707ms | 6.895ms | 11 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.19µs | +17.0% |  | 0.99µs | 1.19µs | 11 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.54µs | -7.0% |  | 5.54µs | 6.13µs | 11 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.44µs | -23.3% |  | 17.15µs | 22.77µs | 11 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.00µs | +16.4% | +17.4% ⚠︎ | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.60µs | +12.4% | +5.2% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 28.14µs | +10.3% | +13.9% ⚠︎ | 24.32µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 253.09µs | +13.4% | +12.7% ⚠︎ | 222.97µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.888ms | +56.8% | +86.4% ⚠︎ | 1.551ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 18.189ms | +41.0% | +55.0% ⚠︎ | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 288.423ms | +49.3% | +69.2% ⚠︎ | 150.737ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 242.60µs | +8.9% |  | 197.56µs | 268.00µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 389.54µs | +2.7% |  | 327.73µs | 473.00µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.122ms | +41.7% |  | 1.495ms | 2.207ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 230.72µs | +6.3% |  | 187.05µs | 283.34µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 730.23µs | -10.4% |  | 528.14µs | 976.95µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.440ms | -45.9% |  | 4.475ms | 12.620ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 215.67µs | +15.1% |  | 171.55µs | 267.92µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 495.87µs | -23.0% |  | 371.58µs | 830.44µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.868ms | -50.1% |  | 2.630ms | 10.511ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 119.86µs | +19.6% |  | 83.88µs | 119.89µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 226.61µs | +22.7% |  | 184.69µs | 261.67µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.747ms | +42.6% |  | 1.226ms | 1.747ms | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.63µs | +30.1% |  | 6.55µs | 8.63µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 20.60µs | +40.4% |  | 14.21µs | 20.60µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 175.47µs | +66.5% |  | 102.78µs | 175.47µs | 15 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 238.12µs | +23.5% | -16.9% ⚠︎ | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 504.64µs | -2.6% | -68.0% ⚠︎ | 374.00µs | 1.779ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.640ms | -44.2% | -92.4% ⚠︎ | 2.568ms | 54.890ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 136.36µs | +0.6% |  | 114.80µs | 165.76µs | 10 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.240ms | -2.3% |  | 1.059ms | 1.471ms | 10 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 623.53µs | -0.5% |  | 533.53µs | 745.85µs | 10 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 168.43µs | -27.0% |  | 141.87µs | 273.39µs | 10 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.494ms | -26.5% |  | 1.267ms | 2.357ms | 10 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 755.48µs | -24.8% |  | 643.84µs | 1.202ms | 10 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 162.08µs | +14.1% |  | 138.92µs | 166.92µs | 10 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.526ms | +5.9% |  | 12.360ms | 14.005ms | 10 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 353.761ms | +7.2% |  | 307.789ms | 360.804ms | 10 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 138.57µs | -30.9% | -29.3% ⚠︎ | 117.03µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.130ms | -33.7% | -31.8% ⚠︎ | 947.47µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 588.06µs | -33.2% | -31.4% ⚠︎ | 490.73µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.698ms | +13.1% | +4.2% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.700ms | +10.8% | +6.8% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.661ms | +16.5% | +7.0% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.686ms | +17.9% | +17.6% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.048ms | +20.2% | +13.4% ⚠︎ | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.615ms | +16.3% | +15.1% ⚠︎ | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.630ms | +17.1% | +17.7% ⚠︎ | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 132.71µs | +5.1% | -24.5% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 72.74µs | +18.1% | +20.5% ⚠︎ | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 854.43µs | +15.9% | +14.9% ⚠︎ | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 869.86µs | +17.9% | +15.0% ⚠︎ | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 881.48µs | +17.2% | +21.0% ⚠︎ | 698.49µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 24.94µs | -31.6% | -29.3% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 25.40µs | -95.8% | -95.7% ⚠︎ | 21.26µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.60µs | +12.5% | +12.3% ⚠︎ | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 696.27µs | +13.1% | +15.9% ⚠︎ | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
