## aui-perf nightly record

_60 points · 2026-09-03T05:27:14.273Z to 2026-11-01T04:28:00.386Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 380.91µs | -22.7% | -41.0% ⚠︎ | 380.91µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 547.50µs | -5.2% | -23.7% ⚠︎ | 525.01µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 26.80µs | +0.8% | -24.1% ⚠︎ | 24.12µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 324.37µs | +5.0% | -18.0% ⚠︎ | 289.55µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.123ms | +6.2% | -17.0% ⚠︎ | 4.560ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 135.19µs | +5.9% | -16.1% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.248ms | +4.4% | -15.8% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.052ms | +6.3% | -16.7% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.60µs | -10.5% | -32.4% ⚠︎ | 4.43µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 38.47µs | -9.1% | -33.3% ⚠︎ | 38.47µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 149.42µs | -10.8% | -33.8% ⚠︎ | 149.42µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.59µs | -5.2% |  | 31.50µs | 46.67µs | 27 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 337.56µs | -1.9% |  | 308.19µs | 414.32µs | 27 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.60µs | +2.2% |  | 3.96µs | 6.38µs | 27 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 41.31µs | +7.2% |  | 34.61µs | 48.58µs | 27 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 319.91µs | -3.4% | -41.8% ⚠︎ | 294.62µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.825ms | -2.2% | -42.9% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.178ms | -1.8% | -43.8% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 182.65µs | -0.5% | -47.1% ⚠︎ | 158.03µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.741ms | +2.0% | -46.0% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.069ms | +3.7% | -45.2% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 113.85µs | -2.4% |  | 106.15µs | 143.16µs | 10 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 726.31µs | -9.1% |  | 642.90µs | 1.001ms | 10 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.74µs | -3.4% | +16.0% ⚠︎ | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 300.34µs | -8.4% | +13.8% ⚠︎ | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.636ms | -6.0% | +14.2% ⚠︎ | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 32.07µs | -9.7% | -2.8% | 30.42µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 328.53µs | -9.1% | -2.9% | 308.71µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.731ms | -12.1% | -5.2% | 1.636ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 17.37µs | -19.4% | -15.7% ⚠︎ | 16.50µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 172.10µs | -19.3% | -15.2% ⚠︎ | 161.50µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 934.35µs | -19.8% | -17.8% ⚠︎ | 873.57µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +13.4% | +18.8% ⚠︎ | 0.10µs | 0.13µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.22µs | +8.3% | +13.5% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.22µs | -1.3% | +1.2% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.31µs | -15.4% | -7.7% | 0.29µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.46µs | -23.2% | -14.9% ⚠︎ | 1.37µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.76µs | -26.4% | -18.1% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 82.29µs | +9.2% | +11.8% ⚠︎ | 62.78µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 441.10µs | -7.1% | -6.6% | 353.15µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.183ms | -11.3% |  | 1.133ms | 1.847ms | 21 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 86.82µs | -16.8% |  | 81.83µs | 119.72µs | 20 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.558ms | +1.4% |  | 1.434ms | 2.155ms | 21 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 217.83µs | -4.7% |  | 214.45µs | 260.16µs | 21 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 311.67µs | -3.1% |  | 295.45µs | 401.63µs | 21 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.087ms | -5.4% |  | 2.767ms | 4.523ms | 21 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 387.15µs | -20.3% |  | 358.89µs | 542.42µs | 20 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.335ms | -4.7% |  | 8.867ms | 12.361ms | 21 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.527ms | -4.3% |  | 1.500ms | 1.877ms | 21 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.109ms | -2.3% |  | 1.048ms | 1.324ms | 21 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.266ms | +18.1% |  | 1.018ms | 1.299ms | 26 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.411ms | +1.8% |  | 1.371ms | 1.583ms | 26 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.528ms | +21.2% |  | 7.336ms | 10.113ms | 26 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.811ms | +18.7% |  | 8.611ms | 11.220ms | 26 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 490.29µs | -15.0% | -8.1% | 459.58µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.130ms | +4.6% | +6.4% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.559ms | +5.6% | +8.1% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.124ms | -0.7% | -1.9% | 1.095ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.052ms | -2.0% | -2.0% | 1.037ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.089ms | +17.5% | +3.0% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 138.86µs | +7.2% |  | 100.23µs | 161.14µs | 27 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.299ms | +6.3% |  | 944.27µs | 1.503ms | 27 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 138.287ms | -0.8% |  | 115.889ms | 170.961ms | 27 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.356ms | +4.8% |  | 4.707ms | 9.051ms | 27 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.09µs | +4.1% |  | 0.99µs | 1.46µs | 27 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.84µs | -15.7% |  | 4.84µs | 10.60µs | 27 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 14.86µs | -26.1% |  | 14.86µs | 38.41µs | 27 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.03µs | +48.6% | +55.8% ⚠︎ | 2.51µs | 4.03µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.55µs | +10.4% | +7.0% | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 39.56µs | +53.5% | +57.3% ⚠︎ | 24.16µs | 39.56µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 151.82µs | -37.8% | -33.1% ⚠︎ | 144.68µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.161ms | -6.0% | +10.0% ⚠︎ | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 17.148ms | +9.0% | +40.2% ⚠︎ | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 259.136ms | +10.3% | +33.0% ⚠︎ | 160.683ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 195.94µs | -0.6% |  | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 347.29µs | +5.5% |  | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.526ms | -10.3% |  | 1.438ms | 2.961ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 210.13µs | +5.9% |  | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 600.45µs | -5.0% |  | 526.75µs | 976.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.332ms | -6.4% |  | 4.475ms | 15.187ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 177.53µs | -12.5% |  | 171.55µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 392.38µs | -10.1% |  | 369.46µs | 830.44µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.868ms | -1.8% |  | 2.560ms | 10.511ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 92.01µs | -3.6% |  | 81.54µs | 132.64µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 191.91µs | -4.6% |  | 184.69µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.323ms | -7.2% |  | 1.226ms | 2.111ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.22µs | +0.2% |  | 6.32µs | 8.76µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.81µs | -12.9% |  | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 111.53µs | -23.8% |  | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 176.84µs | +0.1% | -9.1% | 176.71µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 371.70µs | -7.0% | -31.7% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.846ms | -10.2% | -54.1% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 123.05µs | +3.8% |  | 110.76µs | 165.76µs | 26 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.119ms | +2.8% |  | 1.011ms | 1.471ms | 26 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 565.82µs | +4.3% |  | 512.64µs | 745.85µs | 26 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 142.70µs | -1.9% |  | 131.33µs | 273.39µs | 26 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.263ms | -2.4% |  | 1.199ms | 2.357ms | 26 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 640.05µs | -2.7% |  | 610.01µs | 1.202ms | 26 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 159.55µs | +10.7% |  | 135.97µs | 194.02µs | 26 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.832ms | -4.0% |  | 11.650ms | 16.835ms | 26 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 312.222ms | -7.4% |  | 304.987ms | 638.209ms | 26 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 107.17µs | -6.8% | -46.5% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 916.09µs | -6.4% | -45.5% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 462.67µs | -7.0% | -48.0% ⚠︎ | 435.75µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.757ms | +9.0% | +19.6% ⚠︎ | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.754ms | +7.8% | +17.9% ⚠︎ | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.711ms | +12.6% | +21.1% ⚠︎ | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.526ms | +5.9% | +7.3% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.051ms | +19.3% | +16.1% ⚠︎ | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.549ms | +10.1% | +13.2% ⚠︎ | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.562ms | +10.3% | +17.5% ⚠︎ | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 124.77µs | +4.1% | -4.0% | 110.42µs | 159.52µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 69.25µs | +6.7% | +9.6% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 797.66µs | +8.4% | +11.3% ⚠︎ | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 888.72µs | +17.8% | +22.6% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 874.19µs | +14.2% | +19.0% ⚠︎ | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.93µs | +8.5% | -32.1% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 24.35µs | +9.2% | -96.2% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.82µs | +1.7% | +7.7% | 32.09µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 655.91µs | +3.7% | +5.1% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
