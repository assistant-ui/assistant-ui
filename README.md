## aui-perf nightly record

_50 points · 2026-09-03T05:27:14.273Z to 2026-10-22T04:38:01.473Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 488.61µs | +1.2% | -17.9% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 599.87µs | +5.8% | -9.9% | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 26.51µs | +1.6% | -18.5% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 301.29µs | +0.3% | -17.6% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.651ms | -1.1% | -18.7% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 129.50µs | +3.8% | -17.0% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.209ms | +4.6% | -14.5% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.785ms | +3.5% | -15.7% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.97µs | -0.0% | -23.7% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 39.83µs | -2.2% | -25.3% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 160.85µs | -0.5% | -23.7% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 36.58µs | +5.7% |  | 34.14µs | 44.86µs | 17 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 338.42µs | -0.7% |  | 328.87µs | 414.32µs | 17 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.85µs | +12.0% |  | 4.27µs | 5.49µs | 17 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 37.77µs | +3.3% |  | 35.19µs | 45.55µs | 17 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 311.48µs | -2.5% | -39.4% ⚠︎ | 311.48µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.594ms | -7.7% | -45.0% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.242ms | -7.9% | -45.3% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 163.70µs | -9.1% | -49.0% ⚠︎ | 163.70µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.512ms | -11.5% | -50.2% ⚠︎ | 1.512ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 5.816ms | -13.2% | -52.8% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 30.79µs | +8.9% | +26.4% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 316.95µs | +0.5% | +19.4% ⚠︎ | 256.80µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.756ms | +3.5% | +23.3% ⚠︎ | 1.400ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 38.87µs | +17.8% | +16.3% ⚠︎ | 32.24µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 404.95µs | +19.8% | +19.8% ⚠︎ | 330.50µs | 404.95µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.193ms | +17.9% | +17.8% ⚠︎ | 1.792ms | 2.193ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 23.76µs | +21.0% | +32.0% ⚠︎ | 18.88µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 228.36µs | +18.7% | +30.9% ⚠︎ | 185.12µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.317ms | +26.9% | +34.0% ⚠︎ | 1.038ms | 1.317ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +3.4% | +10.8% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -0.5% | +12.3% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.10µs | -7.6% | +6.4% | 1.10µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.32µs | -9.4% | +1.7% | 0.32µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.10µs | +17.2% | +28.4% ⚠︎ | 1.65µs | 2.14µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.17µs | +23.5% | +32.6% ⚠︎ | 14.82µs | 19.98µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 84.20µs | +13.5% | +19.3% ⚠︎ | 72.89µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 555.92µs | +15.9% | +22.8% ⚠︎ | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.650ms | +42.9% |  | 1.133ms | 1.774ms | 11 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 94.56µs | -2.8% |  | 94.56µs | 118.57µs | 10 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.908ms | +29.1% |  | 1.450ms | 2.024ms | 11 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 236.19µs | +8.9% |  | 216.72µs | 246.18µs | 11 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 348.98µs | +11.5% |  | 295.45µs | 373.70µs | 11 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 4.193ms | +35.8% |  | 2.767ms | 4.523ms | 11 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 410.62µs | -10.7% |  | 410.62µs | 529.40µs | 10 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.190ms | +17.2% |  | 9.408ms | 12.361ms | 11 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.637ms | +9.1% |  | 1.500ms | 1.748ms | 11 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.186ms | +8.5% |  | 1.048ms | 1.303ms | 11 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.125ms | +8.9% |  | 1.018ms | 1.222ms | 16 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.525ms | +4.9% |  | 1.371ms | 1.548ms | 16 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.366ms | -1.0% |  | 7.336ms | 8.816ms | 16 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.899ms | +2.4% |  | 8.670ms | 10.017ms | 16 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 688.75µs | +18.7% | +80.4% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.172ms | +9.9% | +12.4% ⚠︎ | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.532ms | +2.9% | +13.0% ⚠︎ | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.139ms | -0.5% | -2.3% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.134ms | +5.4% | +7.8% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.228ms | -8.1% | -23.0% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 112.98µs | -6.6% |  | 100.23µs | 152.70µs | 17 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.065ms | +0.7% |  | 944.27µs | 1.409ms | 17 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 143.807ms | -0.2% |  | 115.889ms | 170.961ms | 17 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.508ms | +6.1% |  | 4.707ms | 6.895ms | 17 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.15µs | +14.5% |  | 0.99µs | 1.19µs | 17 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.12µs | +5.2% |  | 5.26µs | 6.41µs | 17 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 25.78µs | +22.8% |  | 15.93µs | 29.41µs | 17 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.26µs | +25.1% | +28.4% ⚠︎ | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.95µs | +17.4% | +15.2% ⚠︎ | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 29.96µs | +21.1% | +22.0% ⚠︎ | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 301.70µs | +29.8% | +35.3% ⚠︎ | 223.12µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.515ms | +14.2% | +55.8% ⚠︎ | 1.662ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.739ms | +2.2% | +30.3% ⚠︎ | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 198.749ms | -15.9% | +13.9% ⚠︎ | 159.336ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 263.96µs | +30.5% |  | 197.56µs | 268.00µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 449.86µs | +29.4% |  | 327.73µs | 473.00µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.817ms | +3.7% |  | 1.495ms | 2.207ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 258.02µs | +29.9% |  | 185.62µs | 283.34µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 675.62µs | +18.9% |  | 526.75µs | 976.95µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.330ms | +9.8% |  | 4.475ms | 12.620ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 247.84µs | +24.4% |  | 171.55µs | 267.92µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 497.91µs | +10.8% |  | 371.58µs | 830.44µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.954ms | +32.8% |  | 2.630ms | 10.511ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 128.35µs | +46.2% |  | 83.88µs | 128.35µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 242.39µs | +22.4% |  | 184.69µs | 261.67µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.480ms | +0.9% |  | 1.226ms | 1.890ms | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.81µs | +14.9% |  | 6.55µs | 8.68µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 19.36µs | +29.5% |  | 14.21µs | 20.60µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 155.10µs | +40.7% |  | 102.78µs | 175.47µs | 21 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 267.49µs | +47.0% | +59.0% ⚠︎ | 174.68µs | 267.49µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 501.26µs | +17.6% | -4.6% | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.918ms | +19.9% | -30.8% ⚠︎ | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 120.66µs | +5.1% |  | 113.03µs | 165.76µs | 16 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.112ms | +5.0% |  | 1.028ms | 1.471ms | 16 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 553.06µs | +3.7% |  | 519.49µs | 745.85µs | 16 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 137.46µs | -3.1% |  | 137.46µs | 273.39µs | 16 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.212ms | -4.3% |  | 1.212ms | 2.357ms | 16 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 615.35µs | -4.4% |  | 615.35µs | 1.202ms | 16 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 178.40µs | +28.4% |  | 135.97µs | 188.74µs | 16 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.825ms | +2.4% |  | 11.650ms | 14.005ms | 16 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 638.209ms | +100.5% |  | 304.987ms | 638.209ms | 16 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 102.17µs | -12.7% | -46.8% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 864.16µs | -8.8% | -47.8% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 438.95µs | -10.6% | -48.5% ⚠︎ | 438.95µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.616ms | +9.0% | -1.2% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.614ms | +6.1% | +0.5% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.585ms | +9.7% | +3.6% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.465ms | +2.2% | +3.6% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 992.46µs | +13.0% | +12.5% ⚠︎ | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.370ms | -1.0% | -2.3% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.341ms | +2.4% | -5.2% | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 112.26µs | -2.5% | -36.1% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.86µs | -0.4% | +2.6% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 709.32µs | -1.9% | -2.5% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 847.77µs | +16.2% | +18.3% ⚠︎ | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 886.31µs | +19.2% | +25.0% ⚠︎ | 706.37µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.50µs | +0.4% | -39.0% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.99µs | +1.2% | -96.5% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.87µs | -1.0% | +4.0% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 655.96µs | +2.6% | +9.5% | 599.35µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
