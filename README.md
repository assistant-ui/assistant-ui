## aui-perf nightly record

_57 points · 2026-09-03T05:27:14.273Z to 2026-10-29T04:32:11.419Z · latest runner: AMD EPYC · Node v24.22.2_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 510.63µs | +1.1% | -15.4% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 590.46µs | -1.8% | -13.5% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 25.99µs | -10.5% | -22.8% ⚠︎ | 24.88µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 309.75µs | -8.1% | -16.5% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.720ms | -7.2% | -19.4% ⚠︎ | 4.560ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 129.54µs | -6.1% | -16.5% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.177ms | -2.9% | -17.7% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.680ms | -8.5% | -18.4% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.27µs | +4.9% | -19.0% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 45.00µs | +6.7% | -15.3% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 172.07µs | +6.9% | -17.9% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.61µs | -7.4% |  | 33.46µs | 46.67µs | 24 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 347.11µs | -1.0% |  | 318.63µs | 414.32µs | 24 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.48µs | -17.9% |  | 4.23µs | 6.38µs | 24 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 36.95µs | -11.4% |  | 35.19µs | 48.58µs | 24 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 328.31µs | -1.1% | -36.4% ⚠︎ | 309.68µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.050ms | +11.1% | -34.8% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.895ms | +9.2% | -36.2% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 183.10µs | +9.5% | -45.1% ⚠︎ | 163.70µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.819ms | +10.0% | -41.3% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.788ms | +8.7% | -45.5% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 116.17µs |  |  | 106.15µs | 143.16µs | 7 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 699.54µs |  |  | 699.54µs | 1.001ms | 7 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.92µs | -5.8% | +23.5% ⚠︎ | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 326.72µs | +0.7% | +26.2% ⚠︎ | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.823ms | +2.7% | +28.7% ⚠︎ | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 34.42µs | -11.5% | +5.3% | 32.24µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 353.87µs | -9.5% | +7.1% | 331.62µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.946ms | -10.4% | +7.5% | 1.792ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.16µs | -10.0% | +9.4% | 19.18µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 210.53µs | -7.4% | +9.3% | 185.12µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.146ms | -12.2% | +8.6% | 1.029ms | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -4.2% | +0.1% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +2.6% | +5.0% | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.24µs | +5.8% | +1.8% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | +10.0% | +5.3% | 0.32µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.81µs | -15.7% | +3.8% | 1.65µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.27µs | -18.6% | +5.0% | 14.82µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 76.67µs | -7.1% | +0.4% | 70.88µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 480.81µs | -13.8% | +7.3% | 453.04µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.335ms | -24.7% |  | 1.133ms | 1.847ms | 18 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 105.35µs | +2.8% |  | 94.56µs | 119.72µs | 17 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.567ms | -22.6% |  | 1.434ms | 2.155ms | 18 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 226.88µs | -5.9% |  | 214.45µs | 260.16µs | 18 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 328.40µs | -12.1% |  | 295.45µs | 401.63µs | 18 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.037ms | -32.9% |  | 2.767ms | 4.523ms | 18 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 480.09µs | +12.2% |  | 410.62µs | 542.42µs | 17 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.891ms | -20.0% |  | 9.361ms | 12.361ms | 18 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.599ms | -5.4% |  | 1.500ms | 1.877ms | 18 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.172ms | -3.1% |  | 1.048ms | 1.324ms | 18 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.078ms | -6.2% |  | 1.018ms | 1.273ms | 23 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.401ms | -9.5% |  | 1.371ms | 1.583ms | 23 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.908ms | -0.1% |  | 7.336ms | 9.655ms | 23 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.049ms | -2.8% |  | 8.611ms | 10.475ms | 23 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 511.29µs | -25.5% | +1.5% | 502.65µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.098ms | -6.7% | +7.0% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.246ms | -5.7% | +1.1% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.130ms | -0.1% | +0.7% | 1.095ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.053ms | -6.6% | -0.1% | 1.041ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.824ms | +14.8% | -0.3% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 134.39µs | +16.5% |  | 100.23µs | 161.14µs | 24 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.223ms | +13.7% |  | 944.27µs | 1.503ms | 24 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 151.511ms | -0.5% |  | 115.889ms | 170.961ms | 24 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.379ms | +16.5% |  | 4.707ms | 9.051ms | 24 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.06µs | -5.8% |  | 0.99µs | 1.46µs | 24 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.89µs | -8.2% |  | 5.25µs | 10.60µs | 24 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 24.28µs | -17.5% |  | 15.71µs | 38.41µs | 24 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.70µs | -21.6% | +1.5% | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.35µs | -10.1% | +5.9% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.82µs | -19.8% | -0.1% | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 255.72µs | -20.7% | +9.9% | 223.12µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.287ms | -19.2% | +21.5% ⚠︎ | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 18.303ms | +8.4% | +56.4% ⚠︎ | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 235.309ms | +5.6% | +30.3% ⚠︎ | 160.683ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 208.90µs | -19.2% |  | 191.63µs | 294.40µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 351.83µs | -17.7% |  | 314.68µs | 496.38µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.918ms | -10.2% |  | 1.495ms | 2.961ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 204.54µs | -20.1% |  | 185.62µs | 302.70µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 593.85µs | -24.0% |  | 526.75µs | 976.95µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.105ms | -15.5% |  | 4.475ms | 15.187ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 196.71µs | -23.1% |  | 171.55µs | 319.95µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 437.86µs | -28.5% |  | 371.58µs | 830.44µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.572ms | -26.8% |  | 2.630ms | 10.511ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 91.39µs | -25.9% |  | 83.88µs | 132.64µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 193.22µs | -21.3% |  | 184.69µs | 285.83µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.553ms | -17.8% |  | 1.226ms | 2.111ms | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.35µs | -15.3% |  | 6.55µs | 8.76µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 18.52µs | -9.2% |  | 14.21µs | 22.73µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 150.01µs | -10.6% |  | 102.78µs | 187.99µs | 28 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 197.12µs | -15.9% | +0.8% | 176.71µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 393.45µs | -32.8% | -25.6% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 4.239ms | -11.5% | -34.8% ⚠︎ | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 123.83µs | -12.7% |  | 112.48µs | 165.76µs | 23 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.061ms | -16.1% |  | 1.019ms | 1.471ms | 23 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 560.07µs | -13.1% |  | 512.64µs | 745.85µs | 23 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 151.86µs | -3.0% |  | 135.32µs | 273.39µs | 23 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.344ms | -2.1% |  | 1.205ms | 2.357ms | 23 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 685.39µs | -2.1% |  | 612.98µs | 1.202ms | 23 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 145.23µs | -23.1% |  | 135.97µs | 194.02µs | 23 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.295ms | -5.0% |  | 11.650ms | 16.835ms | 23 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 335.520ms | -31.3% |  | 304.987ms | 638.209ms | 23 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 122.27µs | +15.5% | -37.9% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.035ms | +8.2% | -36.8% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 537.65µs | +15.8% | -37.2% ⚠︎ | 438.95µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.545ms | -4.7% | -4.9% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.569ms | -6.8% | -0.2% | 1.488ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.534ms | -0.7% | -4.7% | 1.414ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.506ms | +0.3% | +6.5% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 903.46µs | -11.4% | -1.2% | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.422ms | -4.1% | -0.1% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.448ms | -5.1% | +3.1% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 128.40µs | +8.0% | -25.7% ⚠︎ | 110.42µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.91µs | +1.3% | +5.0% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 746.66µs | -2.0% | +1.2% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 795.76µs | -6.0% | +11.8% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 772.51µs | -11.9% | +7.9% | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.40µs | +2.1% | -40.0% ⚠︎ | 20.86µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.31µs | +4.3% | -96.2% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.69µs | +3.4% | +2.3% | 32.09µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 635.49µs | -6.4% | -1.7% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
