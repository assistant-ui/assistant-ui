## aui-perf nightly record

_45 points · 2026-09-03T05:27:14.273Z to 2026-10-17T04:35:26.495Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 499.51µs | -23.3% | -22.5% ⚠︎ | 482.81µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 584.89µs | -17.9% | -19.6% ⚠︎ | 567.13µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 27.41µs | -22.0% | -22.1% ⚠︎ | 26.09µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 328.95µs | -15.8% | -16.6% ⚠︎ | 300.46µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.070ms | -16.4% | -17.7% ⚠︎ | 4.704ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 137.42µs | -14.5% | -17.9% ⚠︎ | 124.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.272ms | -13.3% | -17.4% ⚠︎ | 1.156ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.096ms | -13.5% | -17.8% ⚠︎ | 4.622ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.28µs | -24.8% | -26.2% ⚠︎ | 4.97µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 41.54µs | -27.4% | -25.7% ⚠︎ | 40.73µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 162.54µs | -28.0% | -26.4% ⚠︎ | 161.58µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 37.37µs | +5.4% |  | 34.14µs | 44.86µs | 12 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 371.21µs | +5.5% |  | 328.87µs | 414.32µs | 12 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.75µs | +7.2% |  | 4.27µs | 5.49µs | 12 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 41.33µs | +12.2% |  | 35.19µs | 45.55µs | 12 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 348.13µs | -38.2% | -38.3% ⚠︎ | 319.33µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.052ms | -39.6% | -40.9% ⚠︎ | 2.810ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 12.041ms | -40.0% | -41.3% ⚠︎ | 11.122ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 208.61µs | -39.7% | -40.9% ⚠︎ | 180.10µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.861ms | -43.2% | -45.2% ⚠︎ | 1.708ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.651ms | -39.4% | -44.0% ⚠︎ | 6.701ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.82µs | +3.1% | +9.0% | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 332.84µs | +0.8% | +14.1% ⚠︎ | 249.56µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.819ms | +4.5% | +16.3% ⚠︎ | 1.386ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 34.66µs | +1.1% | +16.8% ⚠︎ | 27.63µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 359.64µs | +2.6% | +19.6% ⚠︎ | 281.17µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.949ms | +2.0% | +17.2% ⚠︎ | 1.524ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.72µs | +2.0% | +8.4% | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 204.02µs | -2.5% | +5.0% | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.149ms | +0.6% | +6.4% | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +8.6% | +4.8% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +1.2% | +10.2% ⚠︎ | 0.17µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.27µs | +5.2% | +11.2% ⚠︎ | 0.99µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | +4.4% | +5.0% | 0.30µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.83µs | +3.4% | +4.0% | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.16µs | +1.1% | +2.8% | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.10µs | -5.2% | +1.2% | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 453.04µs | -7.0% | -4.1% | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.184ms |  |  | 1.152ms | 1.495ms | 6 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 105.05µs |  |  | 97.28µs | 118.57µs | 5 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.491ms |  |  | 1.450ms | 1.686ms | 6 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 224.11µs |  |  | 216.72µs | 246.18µs | 6 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 332.38µs |  |  | 295.45µs | 369.60µs | 6 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.001ms |  |  | 3.001ms | 3.283ms | 6 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 492.16µs |  |  | 460.02µs | 529.40µs | 5 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.116ms |  |  | 9.408ms | 11.266ms | 6 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.572ms |  |  | 1.500ms | 1.748ms | 6 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.177ms |  |  | 1.048ms | 1.303ms | 6 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.098ms | +2.0% |  | 1.018ms | 1.222ms | 11 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.437ms | +3.3% |  | 1.371ms | 1.499ms | 11 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.801ms | -4.3% |  | 7.336ms | 8.816ms | 11 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.101ms | -4.9% |  | 8.670ms | 10.017ms | 11 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 607.72µs | +9.7% | +37.3% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.144ms | +11.7% | -1.9% | 1.021ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.509ms | +4.8% | +2.2% | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.139ms | +0.9% | -1.3% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.078ms | +3.5% | -1.8% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.397ms | -14.0% | -18.1% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 134.34µs | +15.1% |  | 100.23µs | 152.70µs | 12 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.226ms | +15.2% |  | 944.27µs | 1.409ms | 12 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 151.160ms | +11.3% |  | 115.889ms | 170.961ms | 12 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.215ms | +14.1% |  | 4.707ms | 6.895ms | 12 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.12µs | +11.3% |  | 0.99µs | 1.19µs | 12 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.26µs | -7.4% |  | 5.26µs | 6.13µs | 12 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 16.07µs | -18.3% |  | 16.07µs | 22.77µs | 12 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.79µs | +5.0% | +1.3% | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.27µs | +5.8% | +3.2% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.47µs | +4.4% | -0.1% | 24.32µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 243.55µs | +4.8% | +3.7% | 222.97µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.575ms | +18.4% | +42.0% ⚠︎ | 1.551ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.712ms | +14.5% | +11.7% ⚠︎ | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 263.684ms | +34.4% | +31.9% ⚠︎ | 150.737ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 210.11µs | -13.2% |  | 197.56µs | 268.00µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 377.38µs | -13.7% |  | 327.73µs | 473.00µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.769ms | +7.9% |  | 1.495ms | 2.207ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 211.45µs | -9.5% |  | 187.05µs | 283.34µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 653.98µs | -22.4% |  | 528.14µs | 976.95µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.780ms | -46.0% |  | 4.475ms | 12.620ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 190.90µs | -14.0% |  | 171.55µs | 267.92µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 408.03µs | -39.1% |  | 371.58µs | 830.44µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.618ms | -46.8% |  | 2.630ms | 10.511ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 107.60µs | +3.4% |  | 83.88µs | 119.89µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 213.53µs | -3.5% |  | 184.69µs | 261.67µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.468ms | -0.7% |  | 1.226ms | 1.747ms | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.09µs | +14.4% |  | 6.55µs | 8.63µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 18.62µs | +16.0% |  | 14.21µs | 20.60µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 146.02µs | +24.9% |  | 102.78µs | 175.47µs | 16 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 205.31µs | +0.7% | -31.4% ⚠︎ | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 384.94µs | -34.6% | -76.4% ⚠︎ | 374.00µs | 1.779ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.997ms | -61.0% | -94.5% ⚠︎ | 2.568ms | 46.356ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 125.84µs | -12.8% |  | 114.80µs | 165.76µs | 11 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.140ms | -11.7% |  | 1.059ms | 1.471ms | 11 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 578.40µs | -10.9% |  | 533.53µs | 745.85µs | 11 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 153.28µs | -34.9% |  | 141.87µs | 273.39µs | 11 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.347ms | -35.2% |  | 1.267ms | 2.357ms | 11 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 687.81µs | -33.9% |  | 643.84µs | 1.202ms | 11 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 148.18µs | -0.5% |  | 138.92µs | 166.92µs | 11 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.982ms | -7.7% |  | 11.982ms | 14.005ms | 11 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 313.970ms | -2.4% |  | 307.789ms | 360.804ms | 11 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 125.98µs | -40.7% | -39.7% ⚠︎ | 117.03µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.026ms | -42.5% | -42.4% ⚠︎ | 947.47µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 532.24µs | -40.4% | -42.1% ⚠︎ | 490.73µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.647ms | +2.8% | -2.5% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.734ms | +6.0% | +4.1% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.589ms | +0.5% | -2.5% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.543ms | +3.5% | -1.2% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 992.17µs | +5.7% | +4.8% | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.460ms | +0.1% | -3.6% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.461ms | +0.0% | -2.5% | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 122.80µs | +6.8% | -34.7% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 67.41µs | +5.6% | +3.6% | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 753.28µs | -2.3% | -4.5% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 780.04µs | -3.0% | +3.0% | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 801.55µs | -2.1% | +3.3% | 698.49µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.04µs | -37.0% | -36.9% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.14µs | -96.6% | -96.4% ⚠︎ | 21.26µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 36.63µs | +6.7% | +4.6% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 685.31µs | +3.5% | +8.3% | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
