## aui-perf nightly record

_55 points · 2026-09-03T05:27:14.273Z to 2026-10-27T04:45:26.712Z · latest runner: AMD EPYC · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 592.13µs | +22.4% | -2.6% | 464.56µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 711.06µs | +24.5% | +4.7% | 538.74µs | 808.41µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 29.82µs | +12.3% | -11.8% ⚠︎ | 24.88µs | 40.75µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 348.40µs | +12.6% | -8.0% | 291.86µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.402ms | +14.9% | -7.4% | 4.560ms | 6.892ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 141.76µs | +12.1% | -9.7% | 120.80µs | 190.46µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.345ms | +14.5% | -6.6% | 1.125ms | 1.714ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.576ms | +18.4% | -2.5% | 4.477ms | 6.879ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.21µs | +19.5% | -6.1% | 4.79µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 50.09µs | +16.9% | -6.7% | 39.16µs | 61.59µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 200.77µs | +19.1% | -4.9% | 155.39µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 42.60µs | +14.5% |  | 33.46µs | 46.67µs | 22 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 407.69µs | +7.8% |  | 318.63µs | 414.32µs | 22 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.09µs | +8.5% |  | 4.23µs | 5.62µs | 22 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 44.66µs | +13.8% |  | 35.19µs | 48.58µs | 22 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 361.10µs | +11.5% | -30.2% ⚠︎ | 309.68µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.146ms | +10.8% | -32.9% ⚠︎ | 2.594ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 12.823ms | +14.4% | -30.9% ⚠︎ | 10.242ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 194.71µs | +0.9% | -41.6% ⚠︎ | 163.70µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.848ms | +3.1% | -42.4% ⚠︎ | 1.512ms | 3.666ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.440ms | -6.5% | -40.1% ⚠︎ | 5.816ms | 15.002ms | 30 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 143.16µs |  |  | 106.15µs | 143.16µs | 5 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 912.81µs |  |  | 758.99µs | 912.81µs | 5 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 33.94µs | +14.9% | +40.5% ⚠︎ | 23.95µs | 33.94µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 371.73µs | +15.1% | +42.1% ⚠︎ | 256.80µs | 371.73µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.096ms | +18.9% | +49.3% ⚠︎ | 1.400ms | 2.096ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 39.60µs | +19.2% | +21.6% ⚠︎ | 32.24µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 407.13µs | +13.1% | +21.5% ⚠︎ | 330.50µs | 407.13µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.278ms | +20.7% | +25.5% ⚠︎ | 1.792ms | 2.278ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 24.79µs | +22.7% | +27.6% ⚠︎ | 19.18µs | 24.79µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 243.91µs | +24.5% | +27.1% ⚠︎ | 185.12µs | 243.91µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.289ms | +20.1% | +23.2% ⚠︎ | 1.029ms | 1.317ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +5.3% | +15.2% ⚠︎ | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.23µs | +16.6% | +21.4% ⚠︎ | 0.19µs | 0.23µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.42µs | +18.8% | +20.5% ⚠︎ | 1.10µs | 1.42µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.44µs | +25.6% | +34.8% ⚠︎ | 0.32µs | 0.44µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.20µs | +24.1% | +29.0% ⚠︎ | 1.65µs | 2.20µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 20.43µs | +29.2% | +33.3% ⚠︎ | 14.82µs | 20.43µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 89.31µs | +13.6% | +18.8% ⚠︎ | 70.88µs | 92.09µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 546.39µs | +15.7% | +21.1% ⚠︎ | 447.91µs | 595.73µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.458ms | +9.6% |  | 1.133ms | 1.774ms | 16 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 119.72µs | +11.8% |  | 94.56µs | 119.72µs | 15 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.776ms | +15.5% |  | 1.434ms | 2.024ms | 16 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 260.16µs | +12.3% |  | 214.45µs | 260.16µs | 16 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 375.76µs | +14.2% |  | 295.45µs | 375.76µs | 16 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.339ms | +0.2% |  | 2.767ms | 4.523ms | 16 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 539.77µs | +10.5% |  | 410.62µs | 542.42µs | 15 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.687ms | +21.0% |  | 9.361ms | 12.361ms | 16 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.877ms | +18.3% |  | 1.500ms | 1.877ms | 16 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.285ms | +13.4% |  | 1.048ms | 1.303ms | 16 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.273ms | +19.5% |  | 1.018ms | 1.273ms | 21 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.486ms | +3.5% |  | 1.371ms | 1.548ms | 21 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.655ms | +19.0% |  | 7.336ms | 9.655ms | 21 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.475ms | +12.6% |  | 8.611ms | 10.475ms | 21 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.199ms | +92.7% | +124.8% ⚠︎ | 502.65µs | 1.199ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.634ms | +52.9% | +53.6% ⚠︎ | 1.019ms | 1.634ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 7.821ms | +72.4% | +78.0% ⚠︎ | 4.065ms | 7.821ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.235ms | +8.1% | +8.9% | 1.095ms | 1.235ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.266ms | +17.2% | +21.3% ⚠︎ | 1.041ms | 1.266ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.665ms | +4.2% | -3.1% | 2.219ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 149.20µs | +22.6% |  | 100.23µs | 161.14µs | 22 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.473ms | +27.4% |  | 944.27µs | 1.503ms | 22 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 154.874ms | +5.1% |  | 115.889ms | 170.961ms | 22 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.951ms | +19.5% |  | 4.707ms | 7.499ms | 22 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.46µs | +29.5% |  | 0.99µs | 1.46µs | 22 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.60µs | +76.4% |  | 5.25µs | 10.60µs | 22 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 38.41µs | +79.2% |  | 15.71µs | 38.41µs | 22 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.83µs | +4.1% | +11.3% ⚠︎ | 2.51µs | 3.44µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.25µs | -0.8% | +8.2% | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 27.87µs | +6.5% | +13.8% ⚠︎ | 24.16µs | 32.20µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 260.28µs | +0.2% | +11.9% ⚠︎ | 223.12µs | 322.31µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 3.911ms | +54.1% | +113.9% ⚠︎ | 1.842ms | 3.911ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 22.808ms | +44.2% | +87.0% ⚠︎ | 11.705ms | 22.808ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 291.583ms | +14.2% | +58.7% ⚠︎ | 160.683ms | 291.583ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 257.59µs | +12.1% |  | 191.63µs | 268.00µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 482.12µs | +27.2% |  | 314.68µs | 482.12µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.961ms | +45.7% |  | 1.495ms | 2.961ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 302.70µs | +36.3% |  | 185.62µs | 302.70µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 783.91µs | +29.4% |  | 526.75µs | 976.95µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 15.187ms | +133.4% |  | 4.475ms | 15.187ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 245.31µs | +26.2% |  | 171.55µs | 267.92µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 519.30µs | +21.1% |  | 371.58µs | 830.44µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 8.489ms | +134.4% |  | 2.630ms | 10.511ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 132.64µs | +20.9% |  | 83.88µs | 132.64µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 285.83µs | +35.7% |  | 184.69µs | 285.83µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.111ms | +52.3% |  | 1.226ms | 2.111ms | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.76µs | +15.6% |  | 6.55µs | 8.76µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 22.73µs | +19.7% |  | 14.21µs | 22.73µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 187.99µs | +18.0% |  | 102.78µs | 187.99µs | 26 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 234.66µs | +9.2% | +24.1% ⚠︎ | 176.71µs | 267.49µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 546.48µs | +38.7% | +1.6% | 360.32µs | 643.26µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.693ms | +179.3% | +40.7% ⚠︎ | 2.568ms | 18.547ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 156.43µs | +35.3% |  | 112.48µs | 165.76µs | 21 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.372ms | +28.3% |  | 1.019ms | 1.471ms | 21 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 717.64µs | +36.1% |  | 512.64µs | 745.85µs | 21 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 187.14µs | +31.8% |  | 135.32µs | 273.39µs | 21 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.671ms | +35.1% |  | 1.205ms | 2.357ms | 21 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 835.25µs | +32.1% |  | 612.98µs | 1.202ms | 21 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 178.03µs | +24.9% |  | 135.97µs | 188.74µs | 21 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 16.782ms | +32.5% |  | 11.650ms | 16.782ms | 21 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 368.320ms | +1.3% |  | 304.987ms | 638.209ms | 21 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 152.46µs | +34.8% | -21.8% ⚠︎ | 102.17µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.260ms | +33.3% | -23.2% ⚠︎ | 864.16µs | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 683.79µs | +36.5% | -19.6% ⚠︎ | 438.95µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.162ms | +39.5% | +33.7% ⚠︎ | 1.470ms | 2.162ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.110ms | +37.4% | +27.2% ⚠︎ | 1.488ms | 2.110ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.075ms | +38.4% | +28.1% ⚠︎ | 1.414ms | 2.075ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.675ms | +11.9% | +19.6% ⚠︎ | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.159ms | +30.7% | +24.4% ⚠︎ | 826.58µs | 1.159ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.742ms | +23.8% | +17.7% ⚠︎ | 1.309ms | 1.742ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.806ms | +26.8% | +21.0% ⚠︎ | 1.307ms | 1.806ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 159.52µs | +33.0% | -10.9% ⚠︎ | 110.42µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 71.94µs | +7.2% | +16.5% ⚠︎ | 60.96µs | 74.62µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 935.28µs | +25.4% | +19.2% ⚠︎ | 689.25µs | 935.28µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 850.99µs | +11.4% | +20.1% ⚠︎ | 711.79µs | 905.34µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 897.87µs | +15.5% | +22.1% ⚠︎ | 715.74µs | 946.43µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.48µs | +3.6% | -34.9% ⚠︎ | 20.86µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 24.53µs | +8.9% | -96.1% ⚠︎ | 21.05µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 45.40µs | +30.5% | +32.8% ⚠︎ | 32.09µs | 45.40µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 697.93µs | +7.4% | +8.3% | 587.81µs | 738.84µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
