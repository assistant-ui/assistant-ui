## aui-perf nightly record

_56 points · 2026-09-03T05:27:14.273Z to 2026-10-28T04:32:51.811Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 565.74µs | +17.0% | -6.9% | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 641.29µs | +12.3% | -5.6% | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 28.01µs | +5.5% | -17.2% ⚠︎ | 24.88µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 324.42µs | +4.8% | -14.3% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.047ms | +7.4% | -13.5% ⚠︎ | 4.560ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 137.35µs | +8.6% | -12.5% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.258ms | +7.1% | -12.6% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.225ms | +11.0% | -8.7% | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.16µs | +18.4% | -7.0% | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 46.16µs | +7.7% | -14.0% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 192.35µs | +14.1% | -8.9% | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 41.61µs | +11.8% |  | 33.46µs | 46.67µs | 23 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 369.49µs | -2.3% |  | 318.63µs | 414.32µs | 23 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.38µs | +36.2% |  | 4.23µs | 6.38µs | 23 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 41.81µs | +6.5% |  | 35.19µs | 48.58µs | 23 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 348.52µs | +7.6% | -32.6% ⚠︎ | 309.68µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.996ms | +5.5% | -36.1% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.294ms | +0.8% | -39.1% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 215.49µs | +11.7% | -35.4% ⚠︎ | 163.70µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.718ms | -4.2% | -46.5% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.935ms | -12.9% | -44.2% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 120.29µs |  |  | 106.15µs | 143.16µs | 6 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.001ms |  |  | 758.99µs | 1.001ms | 6 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 34.24µs | +15.9% | +41.7% ⚠︎ | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 352.52µs | +9.2% | +34.7% ⚠︎ | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.064ms | +17.1% | +47.0% ⚠︎ | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 43.42µs | +30.7% | +33.3% ⚠︎ | 32.24µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 432.37µs | +20.2% | +29.0% ⚠︎ | 330.50µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.378ms | +26.0% | +31.1% ⚠︎ | 1.792ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 26.01µs | +28.7% | +33.9% ⚠︎ | 19.18µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 251.92µs | +28.6% | +31.3% ⚠︎ | 185.12µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.424ms | +32.6% | +36.1% ⚠︎ | 1.029ms | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +6.6% | +16.7% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +6.1% | +10.5% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.18µs | -1.0% | +0.4% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.51µs | +44.1% | +54.6% ⚠︎ | 0.32µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.28µs | +28.5% | +33.6% ⚠︎ | 1.65µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 20.63µs | +30.5% | +34.6% ⚠︎ | 14.82µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 96.58µs | +22.9% | +28.5% ⚠︎ | 70.88µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 586.65µs | +24.2% | +30.0% ⚠︎ | 447.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.847ms | +38.8% |  | 1.133ms | 1.847ms | 17 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 105.17µs | -1.8% |  | 94.56µs | 119.72µs | 16 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.155ms | +40.1% |  | 1.434ms | 2.155ms | 17 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 252.56µs | +9.1% |  | 214.45µs | 260.16µs | 17 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 401.63µs | +22.1% |  | 295.45µs | 401.63µs | 17 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 4.161ms | +24.8% |  | 2.767ms | 4.523ms | 17 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 454.74µs | -6.9% |  | 410.62µs | 542.42µs | 16 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.984ms | +24.1% |  | 9.361ms | 12.361ms | 17 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.851ms | +16.7% |  | 1.500ms | 1.877ms | 17 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.324ms | +16.8% |  | 1.048ms | 1.324ms | 17 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.192ms | +11.9% |  | 1.018ms | 1.273ms | 22 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.583ms | +10.3% |  | 1.371ms | 1.583ms | 22 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.202ms | +1.1% |  | 7.336ms | 9.655ms | 22 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.653ms | +3.8% |  | 8.611ms | 10.475ms | 22 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 762.63µs | +22.6% | +42.9% ⚠︎ | 502.65µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.334ms | +24.7% | +25.3% ⚠︎ | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.935ms | +8.8% | +12.3% ⚠︎ | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.220ms | +6.8% | +7.6% | 1.095ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.154ms | +6.8% | +10.6% ⚠︎ | 1.041ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.264ms | -11.5% | -17.7% ⚠︎ | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 141.59µs | +16.3% |  | 100.23µs | 161.14µs | 23 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.339ms | +15.9% |  | 944.27µs | 1.503ms | 23 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 162.692ms | +10.5% |  | 115.889ms | 170.961ms | 23 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 9.051ms | +55.6% |  | 4.707ms | 9.051ms | 23 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.21µs | +6.9% |  | 0.99µs | 1.46µs | 23 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.32µs | +5.2% |  | 5.25µs | 10.60µs | 23 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 30.85µs | +43.9% |  | 15.71µs | 38.41µs | 23 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.25µs | +19.6% | +28.0% ⚠︎ | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.93µs | +12.8% | +23.1% ⚠︎ | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 31.42µs | +20.1% | +28.4% ⚠︎ | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 320.89µs | +23.5% | +37.9% ⚠︎ | 223.12µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 3.105ms | +22.3% | +69.8% ⚠︎ | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 17.746ms | +12.2% | +45.5% ⚠︎ | 11.705ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 221.386ms | -13.3% | +20.5% ⚠︎ | 160.683ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 294.40µs | +28.2% |  | 191.63µs | 294.40µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 496.38µs | +31.0% |  | 314.68µs | 496.38µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.282ms | +12.3% |  | 1.495ms | 2.961ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 273.25µs | +23.0% |  | 185.62µs | 302.70µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 729.78µs | +20.4% |  | 526.75µs | 976.95µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 9.579ms | +47.2% |  | 4.475ms | 15.187ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 319.95µs | +64.6% |  | 171.55µs | 319.95µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 580.58µs | +35.4% |  | 371.58µs | 830.44µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 5.337ms | +47.4% |  | 2.630ms | 10.511ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 129.59µs | +18.2% |  | 83.88µs | 132.64µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 270.07µs | +28.2% |  | 184.69µs | 285.83µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.650ms | +19.0% |  | 1.226ms | 2.111ms | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.45µs | +11.6% |  | 6.55µs | 8.76µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 21.18µs | +11.6% |  | 14.21µs | 22.73µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 163.40µs | +2.5% |  | 102.78µs | 187.99µs | 27 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 305.81µs | +42.3% | +61.8% ⚠︎ | 176.71µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 634.88µs | +61.1% | +18.1% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.414ms | +106.1% | +3.8% | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 150.71µs | +30.4% |  | 112.48µs | 165.76µs | 22 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.323ms | +23.8% |  | 1.019ms | 1.471ms | 22 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 678.94µs | +28.8% |  | 512.64µs | 745.85µs | 22 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 161.21µs | +13.5% |  | 135.32µs | 273.39µs | 22 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.470ms | +18.9% |  | 1.205ms | 2.357ms | 22 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 757.73µs | +19.8% |  | 612.98µs | 1.202ms | 22 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 194.02µs | +36.1% |  | 135.97µs | 194.02µs | 22 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 16.835ms | +33.0% |  | 11.650ms | 16.835ms | 22 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 510.880ms | +40.5% |  | 304.987ms | 638.209ms | 22 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 131.24µs | +16.0% | -32.7% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 985.20µs | +4.2% | -39.9% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 501.59µs | +0.1% | -41.0% ⚠︎ | 438.95µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.722ms | +11.1% | +6.5% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.655ms | +7.7% | -0.2% | 1.488ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.584ms | +5.6% | -2.2% | 1.414ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.643ms | +9.9% | +17.3% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.057ms | +19.2% | +13.5% ⚠︎ | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.596ms | +13.5% | +7.8% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.521ms | +6.7% | +1.9% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 117.27µs | -2.3% | -34.5% ⚠︎ | 110.42µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.49µs | -3.9% | +4.4% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 789.03µs | +5.8% | +0.6% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.063ms | +39.2% | +50.1% ⚠︎ | 711.79µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 933.97µs | +20.1% | +27.0% ⚠︎ | 715.74µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 25.01µs | +10.4% | -30.6% ⚠︎ | 20.86µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 24.95µs | +10.8% | -96.0% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.85µs | +8.8% | +10.7% ⚠︎ | 32.09µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 693.40µs | +6.7% | +7.6% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
