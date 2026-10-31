## aui-perf nightly record

_59 points · 2026-09-03T05:27:14.273Z to 2026-10-31T04:26:56.887Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 413.80µs | -24.3% | -34.6% ⚠︎ | 383.57µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 553.62µs | -14.4% | -22.5% ⚠︎ | 525.01µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 25.28µs | -20.3% | -24.4% ⚠︎ | 24.12µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 308.14µs | -15.5% | -17.3% ⚠︎ | 289.55µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.758ms | -15.3% | -18.7% ⚠︎ | 4.560ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 127.63µs | -16.1% | -17.9% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.195ms | -13.0% | -18.4% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.767ms | -13.9% | -17.3% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.78µs | -16.2% | -29.0% ⚠︎ | 4.43µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 40.84µs | -9.9% | -27.1% ⚠︎ | 38.92µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 160.72µs | -11.0% | -27.0% ⚠︎ | 150.64µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 32.91µs | -29.5% |  | 31.50µs | 46.67µs | 26 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 325.77µs | -19.1% |  | 308.19µs | 414.32µs | 26 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.10µs | -27.1% |  | 3.96µs | 6.38µs | 26 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.67µs | -26.6% |  | 34.61µs | 48.58µs | 26 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 307.13µs | -19.0% | -43.1% ⚠︎ | 294.62µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.800ms | -15.1% | -42.8% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.086ms | -15.5% | -42.6% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 164.34µs | -29.0% | -50.5% ⚠︎ | 158.03µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.608ms | -26.1% | -47.7% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.439ms | -27.7% | -47.8% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 115.91µs | -10.1% |  | 106.15µs | 143.16µs | 9 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 694.82µs | -8.9% |  | 642.90µs | 1.001ms | 9 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.55µs | -8.1% | +16.4% ⚠︎ | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 304.96µs | -14.4% | +11.1% ⚠︎ | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.630ms | -15.7% | +9.6% | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 32.38µs | -16.1% | -5.5% | 30.42µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 327.92µs | -17.5% | -6.7% | 308.71µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.732ms | -20.2% | -10.0% | 1.636ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 17.76µs | -24.0% | -12.4% ⚠︎ | 16.50µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 173.23µs | -24.0% | -14.5% ⚠︎ | 161.50µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 931.20µs | -23.6% | -15.1% ⚠︎ | 873.57µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.13µs | +3.3% | +24.7% ⚠︎ | 0.10µs | 0.13µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.22µs | -0.5% | +17.9% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.23µs | -9.7% | +3.9% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.31µs | -24.4% | -4.1% | 0.29µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.45µs | -30.7% | -16.6% ⚠︎ | 1.37µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.94µs | -32.2% | -17.5% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 63.44µs | -31.1% | -13.6% ⚠︎ | 62.78µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 362.20µs | -39.1% | -20.8% ⚠︎ | 353.15µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.266ms | -3.9% |  | 1.133ms | 1.847ms | 20 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 87.34µs | -25.2% |  | 81.83µs | 119.72µs | 19 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.649ms | -0.6% |  | 1.434ms | 2.155ms | 20 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 236.17µs | -2.2% |  | 214.45µs | 260.16µs | 20 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 313.13µs | -14.2% |  | 295.45µs | 401.63µs | 20 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.475ms | -1.7% |  | 2.767ms | 4.523ms | 20 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 390.20µs | -28.1% |  | 358.89µs | 542.42µs | 19 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.491ms | -12.3% |  | 8.867ms | 12.361ms | 20 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.620ms | -6.0% |  | 1.500ms | 1.877ms | 20 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.120ms | -13.6% |  | 1.048ms | 1.324ms | 20 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.299ms | +8.6% |  | 1.018ms | 1.299ms | 25 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.450ms | -2.2% |  | 1.371ms | 1.583ms | 25 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 10.113ms | +18.6% |  | 7.336ms | 10.113ms | 25 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 11.220ms | +13.7% |  | 8.611ms | 11.220ms | 25 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 476.65µs | -39.4% | -14.0% ⚠︎ | 459.58µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.104ms | -8.7% | +3.3% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.425ms | -10.5% | -0.2% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.111ms | -0.8% | -0.3% | 1.095ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.037ms | -8.3% | -2.5% | 1.037ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.859ms | +28.8% | +6.6% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 118.83µs | -26.3% |  | 100.23µs | 161.14µs | 26 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.114ms | -25.9% |  | 944.27µs | 1.503ms | 26 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 123.786ms | -26.5% |  | 115.889ms | 170.961ms | 26 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.539ms | -26.1% |  | 4.707ms | 9.051ms | 26 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.06µs | -10.4% |  | 0.99µs | 1.46µs | 26 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.90µs | -10.5% |  | 4.84µs | 10.60µs | 26 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.43µs | -2.7% |  | 15.71µs | 38.41µs | 26 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.84µs | +27.6% | +52.1% ⚠︎ | 2.51µs | 3.84µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.27µs | +4.8% | +10.5% ⚠︎ | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 37.92µs | +32.5% | +55.0% ⚠︎ | 24.16µs | 37.92µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 145.47µs | -45.7% | -35.6% ⚠︎ | 144.68µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.003ms | -33.0% | -1.4% | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.343ms | -22.1% | +9.8% | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 216.069ms | -25.3% | +15.2% ⚠︎ | 160.683ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 195.48µs | -20.7% |  | 183.67µs | 294.40µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 336.07µs | -15.2% |  | 314.68µs | 496.38µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.539ms | -27.9% |  | 1.438ms | 2.961ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 186.94µs | -19.4% |  | 177.60µs | 302.70µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 541.56µs | -19.4% |  | 526.75µs | 976.95µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.723ms | -31.4% |  | 4.475ms | 15.187ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 177.30µs | -20.7% |  | 171.55µs | 319.95µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 391.44µs | -22.7% |  | 369.46µs | 830.44µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.687ms | -19.6% |  | 2.560ms | 10.511ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 82.91µs | -25.1% |  | 81.54µs | 132.64µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 186.53µs | -20.2% |  | 184.69µs | 285.83µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.322ms | -13.8% |  | 1.226ms | 2.111ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.51µs | -23.9% |  | 6.32µs | 8.76µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.26µs | -27.0% |  | 14.21µs | 22.73µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 115.11µs | -30.0% |  | 102.78µs | 187.99µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 179.53µs | -17.7% | -6.8% | 176.71µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 404.58µs | -19.1% | -23.5% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.962ms | -11.6% | -61.5% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 115.74µs | -14.7% |  | 110.76µs | 165.76µs | 25 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.063ms | -13.7% |  | 1.011ms | 1.471ms | 25 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 535.08µs | -13.3% |  | 512.64µs | 745.85µs | 25 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 139.73µs | -15.9% |  | 131.33µs | 273.39µs | 25 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.249ms | -14.5% |  | 1.199ms | 2.357ms | 25 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 635.45µs | -14.1% |  | 610.01µs | 1.202ms | 25 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 158.71µs | -1.7% |  | 135.97µs | 194.02µs | 25 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.691ms | -11.3% |  | 11.650ms | 16.835ms | 25 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 306.376ms | -14.8% |  | 304.987ms | 638.209ms | 25 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 104.16µs | -22.8% | -47.6% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 890.26µs | -18.2% | -46.3% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 452.74µs | -19.7% | -47.2% ⚠︎ | 435.75µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.638ms | -9.5% | -0.7% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.641ms | -8.6% | -2.7% | 1.488ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.599ms | -8.1% | +0.6% | 1.414ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.489ms | -11.7% | +2.5% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 928.83µs | -11.1% | -3.0% | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.517ms | -6.8% | -0.0% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.509ms | -1.6% | +3.8% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 117.33µs | -12.2% | -35.2% ⚠︎ | 110.42µs | 159.52µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 67.08µs | -9.0% | +8.7% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 814.52µs | -4.8% | +1.4% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 815.10µs | -5.0% | +14.3% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 833.10µs | -7.1% | +15.8% ⚠︎ | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.23µs | -6.4% | -36.5% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.58µs | -10.3% | -96.1% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.59µs | -9.9% | -2.1% | 32.09µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 703.92µs | -1.3% | +15.4% ⚠︎ | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
