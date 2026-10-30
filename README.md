## aui-perf nightly record

_58 points · 2026-09-03T05:27:14.273Z to 2026-10-30T04:31:11.154Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 383.57µs | -21.5% | -43.6% ⚠︎ | 383.57µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 525.01µs | -12.5% | -30.0% ⚠︎ | 525.01µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 24.12µs | -9.0% | -33.3% ⚠︎ | 24.12µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 289.55µs | -3.9% | -28.7% ⚠︎ | 289.55µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.638ms | -0.3% | -26.0% ⚠︎ | 4.560ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 121.43µs | -6.2% | -29.0% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.147ms | -5.1% | -25.9% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.597ms | -3.9% | -26.9% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.43µs | -10.9% | -40.2% ⚠︎ | 4.43µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 38.92µs | -2.3% | -34.7% ⚠︎ | 38.92µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 150.64µs | -6.3% | -34.9% ⚠︎ | 150.64µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 31.50µs | -13.9% |  | 31.50µs | 46.67µs | 25 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 308.19µs | -8.9% |  | 308.19µs | 414.32µs | 25 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 3.96µs | -18.3% |  | 3.96µs | 6.38µs | 25 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 34.61µs | -8.4% |  | 34.61µs | 48.58µs | 25 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 294.62µs | -5.4% | -49.0% ⚠︎ | 294.62µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.751ms | +6.1% | -47.6% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.859ms | +6.0% | -47.7% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 158.03µs | -3.5% | -56.7% ⚠︎ | 158.03µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.526ms | +0.9% | -55.2% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.158ms | +5.9% | -53.8% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 112.53µs |  |  | 106.15µs | 143.16µs | 8 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 642.90µs |  |  | 642.90µs | 1.001ms | 8 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.01µs | -9.0% | +4.5% | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 287.78µs | -9.2% | -1.8% | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.518ms | -13.6% | -0.9% | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 30.42µs | -21.7% | -17.2% ⚠︎ | 30.42µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 308.71µs | -23.8% | -17.5% ⚠︎ | 308.71µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.636ms | -25.4% | -18.4% ⚠︎ | 1.636ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 16.50µs | -30.5% | -24.2% ⚠︎ | 16.50µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 161.50µs | -29.3% | -24.9% ⚠︎ | 161.50µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 873.57µs | -33.7% | -25.7% ⚠︎ | 873.57µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +9.5% | +7.3% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +7.1% | +0.2% | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.15µs | +4.3% | -13.5% ⚠︎ | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.29µs | -8.7% | -20.8% ⚠︎ | 0.29µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.37µs | -34.7% | -28.3% ⚠︎ | 1.37µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.05µs | -37.1% | -31.3% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 62.78µs | -25.4% | -24.6% ⚠︎ | 62.78µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 353.15µs | -36.5% | -33.0% ⚠︎ | 353.15µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.158ms | -29.8% |  | 1.133ms | 1.847ms | 19 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 81.83µs | -13.5% |  | 81.83µs | 119.72µs | 18 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.533ms | -19.7% |  | 1.434ms | 2.155ms | 19 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 214.97µs | -9.0% |  | 214.45µs | 260.16µs | 19 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 295.65µs | -15.3% |  | 295.45µs | 401.63µs | 19 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.224ms | -23.1% |  | 2.767ms | 4.523ms | 19 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 358.89µs | -12.6% |  | 358.89µs | 542.42µs | 18 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 8.867ms | -20.8% |  | 8.867ms | 12.361ms | 19 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.504ms | -8.1% |  | 1.500ms | 1.877ms | 19 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.057ms | -10.8% |  | 1.048ms | 1.324ms | 19 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.210ms | +7.5% |  | 1.018ms | 1.273ms | 24 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.377ms | -9.7% |  | 1.371ms | 1.583ms | 24 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.331ms | +26.7% |  | 7.336ms | 9.655ms | 24 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.484ms | +17.8% |  | 8.611ms | 10.484ms | 24 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 459.58µs | -33.3% | -28.9% ⚠︎ | 459.58µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.049ms | -10.4% | -9.5% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.123ms | -9.0% | -20.5% ⚠︎ | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.121ms | -1.6% | -5.0% | 1.095ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.046ms | -7.8% | -5.9% | 1.041ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.634ms | +18.2% | -3.6% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 114.34µs | +1.2% |  | 100.23µs | 161.14µs | 25 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.105ms | +3.7% |  | 944.27µs | 1.503ms | 25 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 119.232ms | -17.1% |  | 115.889ms | 170.961ms | 25 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.509ms | +0.0% |  | 4.707ms | 9.051ms | 25 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 0.99µs | -14.0% |  | 0.99µs | 1.46µs | 25 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.84µs | -20.9% |  | 4.84µs | 10.60µs | 25 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.69µs | -31.4% |  | 15.71µs | 38.41µs | 25 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.78µs | +15.7% | +38.1% ⚠︎ | 2.51µs | 3.78µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.82µs | -1.0% | -8.2% | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 36.88µs | +23.1% | +40.7% ⚠︎ | 24.16µs | 36.88µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 144.68µs | -52.0% | -46.1% ⚠︎ | 144.68µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.940ms | -22.9% | -23.6% ⚠︎ | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.548ms | -7.6% | -11.1% ⚠︎ | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 216.469ms | +8.9% | -10.0% ⚠︎ | 160.683ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 183.67µs | -30.4% |  | 183.67µs | 294.40µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 316.48µs | -29.6% |  | 314.68µs | 496.38µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.438ms | -20.9% |  | 1.438ms | 2.961ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 177.60µs | -31.2% |  | 177.60µs | 302.70µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 553.95µs | -18.0% |  | 526.75µs | 976.95µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.572ms | -27.8% |  | 4.475ms | 15.187ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 177.13µs | -28.5% |  | 171.55µs | 319.95µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 369.46µs | -25.8% |  | 369.46µs | 830.44µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.560ms | -35.3% |  | 2.560ms | 10.511ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 81.54µs | -36.5% |  | 81.54µs | 132.64µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 186.12µs | -23.2% |  | 184.69µs | 285.83µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.266ms | -14.5% |  | 1.226ms | 2.111ms | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.32µs | -19.1% |  | 6.32µs | 8.76µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.88µs | -23.1% |  | 14.21µs | 22.73µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 109.92µs | -29.1% |  | 102.78µs | 187.99µs | 29 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 179.02µs | -33.1% | -13.1% ⚠︎ | 176.71µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 366.31µs | -26.9% | -40.0% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.828ms | -27.8% | -84.8% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 110.76µs | -8.2% |  | 110.76µs | 165.76µs | 24 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.011ms | -9.1% |  | 1.011ms | 1.471ms | 24 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 512.92µs | -7.3% |  | 512.64µs | 745.85µs | 24 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 131.33µs | -4.5% |  | 131.33µs | 273.39µs | 24 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.199ms | -1.1% |  | 1.199ms | 2.357ms | 24 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 610.01µs | -0.9% |  | 610.01µs | 1.202ms | 24 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 152.22µs | -14.7% |  | 135.97µs | 194.02µs | 24 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.679ms | -8.9% |  | 11.650ms | 16.835ms | 24 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 306.631ms | -52.0% |  | 304.987ms | 638.209ms | 24 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 102.22µs | +0.1% | -53.9% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 869.53µs | +0.6% | -52.6% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 435.75µs | -0.7% | -53.9% ⚠︎ | 435.75µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.552ms | -4.0% | -11.4% ⚠︎ | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.525ms | -5.5% | -15.4% ⚠︎ | 1.488ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.485ms | -6.3% | -15.3% ⚠︎ | 1.414ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.386ms | -5.4% | -10.4% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 877.72µs | -11.6% | -13.5% ⚠︎ | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.404ms | +2.4% | -12.7% ⚠︎ | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.401ms | +4.5% | -12.9% ⚠︎ | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 111.04µs | -1.1% | -47.3% ⚠︎ | 110.42µs | 181.01µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.64µs | +4.5% | -2.4% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 753.81µs | +6.3% | -12.1% ⚠︎ | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 762.89µs | -10.0% | -3.9% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 777.38µs | -12.3% | -3.9% | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.50µs | +4.7% | -48.6% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.59µs | +2.7% | -96.6% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.15µs | -7.8% | -20.1% ⚠︎ | 32.09µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 644.23µs | -1.8% | -8.1% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
