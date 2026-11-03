## aui-perf nightly record

_62 points · 2026-09-03T05:27:14.273Z to 2026-11-03T04:28:34.386Z · latest runner: Intel(R) Xeon(R) Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 367.63µs | -26.6% | -37.9% ⚠︎ | 367.63µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 529.77µs | -9.3% | -24.6% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 25.16µs | -9.5% | -26.7% ⚠︎ | 23.89µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 292.27µs | -10.1% | -23.1% ⚠︎ | 286.42µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.624ms | -8.0% | -21.1% ⚠︎ | 4.549ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 123.01µs | -9.2% | -23.6% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.149ms | -7.6% | -21.3% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.646ms | -6.7% | -21.1% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.36µs | -18.1% | -35.9% ⚠︎ | 4.36µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 36.51µs | -13.8% | -31.5% ⚠︎ | 36.51µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 142.67µs | -12.2% | -32.3% ⚠︎ | 142.67µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 32.66µs | -18.9% |  | 30.81µs | 46.67µs | 29 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 319.09µs | -13.8% |  | 302.25µs | 414.32µs | 29 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.32µs | -17.2% |  | 3.83µs | 6.38µs | 29 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.90µs | -18.3% |  | 32.88µs | 48.58µs | 29 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 285.01µs | -17.3% | -48.5% ⚠︎ | 285.01µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.538ms | -16.8% | -49.1% ⚠︎ | 2.538ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 9.923ms | -18.0% | -49.5% ⚠︎ | 9.923ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 142.62µs | -23.3% | -56.8% ⚠︎ | 142.62µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.370ms | -21.3% | -55.4% ⚠︎ | 1.370ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 5.429ms | -20.5% | -56.4% ⚠︎ | 5.429ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 102.57µs | -15.3% |  | 102.57µs | 143.16µs | 12 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 844.10µs | -3.8% |  | 642.90µs | 1.001ms | 12 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 30.08µs | +2.1% | +21.3% ⚠︎ | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 301.32µs | -9.6% | +13.1% ⚠︎ | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.549ms | -13.2% | +9.1% | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 34.96µs | -1.6% | +3.3% | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 355.96µs | -2.3% | +4.1% | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.887ms | -4.2% | +1.6% | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.68µs | -11.5% | -6.5% | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 185.51µs | -8.3% | -4.6% | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.009ms | -11.1% | -3.3% | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +7.0% | +11.8% ⚠︎ | 0.10µs | 0.13µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -2.0% | +7.0% | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.10µs | -13.1% | -8.2% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.27µs | -28.7% | -23.5% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.50µs | -22.2% | -17.3% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 13.82µs | -18.4% | -13.5% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.77µs | -9.2% | -3.5% | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 422.05µs | -12.3% | -13.3% ⚠︎ | 352.03µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.362ms | +14.0% |  | 1.133ms | 1.847ms | 23 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 79.43µs | -24.9% |  | 79.43µs | 119.72µs | 22 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.765ms | +16.7% |  | 1.434ms | 2.155ms | 23 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 224.46µs | +0.6% |  | 213.31µs | 260.16µs | 23 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 331.54µs | +1.5% |  | 294.65µs | 401.63µs | 23 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.667ms | +15.0% |  | 2.767ms | 4.523ms | 23 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 319.30µs | -36.1% |  | 319.30µs | 542.42µs | 22 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.123ms | -0.0% |  | 8.621ms | 12.361ms | 23 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.588ms | +0.6% |  | 1.466ms | 1.877ms | 23 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.126ms | -4.1% |  | 1.047ms | 1.324ms | 23 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.332ms | +21.8% |  | 1.018ms | 1.332ms | 28 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.508ms | +6.3% |  | 1.339ms | 1.583ms | 28 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.550ms | +21.6% |  | 7.336ms | 10.113ms | 28 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 11.049ms | +20.0% |  | 8.611ms | 11.220ms | 28 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 530.97µs | -16.4% | +3.6% | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.172ms | +4.9% | +10.2% ⚠︎ | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.454ms | -2.1% | +1.9% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.114ms | -1.3% | -1.8% | 1.104ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.119ms | +4.3% | +2.7% | 1.037ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.742ms | +18.0% | -0.3% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 119.12µs | -19.4% |  | 100.23µs | 161.14µs | 29 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.112ms | -21.0% |  | 944.27µs | 1.503ms | 29 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 128.350ms | -12.7% |  | 115.601ms | 170.961ms | 29 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.613ms | -21.3% |  | 4.707ms | 9.051ms | 29 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs | -9.3% |  | 0.99µs | 1.46µs | 29 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.53µs | +5.3% |  | 4.84µs | 10.60µs | 29 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 23.70µs | +50.9% |  | 14.86µs | 38.41µs | 29 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.07µs | +8.6% | +14.6% ⚠︎ | 2.51µs | 4.03µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.64µs | +24.1% | +17.6% ⚠︎ | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.24µs | +13.8% | +17.3% ⚠︎ | 24.16µs | 39.56µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 144.85µs | -41.4% | -35.7% ⚠︎ | 139.15µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.050ms | -20.6% | +1.2% | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.934ms | -22.3% | +5.4% | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 181.587ms | -25.4% | -8.4% | 177.541ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 201.64µs | -4.8% | -10.8% ⚠︎ | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 364.33µs | -4.4% | -4.3% | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.702ms | -15.0% | +8.8% | 1.438ms | 2.961ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 203.99µs | -3.9% | -2.3% | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 632.94µs | +4.1% | -19.1% ⚠︎ | 525.40µs | 954.53µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.239ms | -17.5% | -55.6% ⚠︎ | 4.475ms | 15.187ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 195.79µs | +1.3% | +4.5% | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 452.61µs | +13.2% | -27.5% ⚠︎ | 369.46µs | 742.82µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.251ms | +4.0% | -54.7% ⚠︎ | 2.554ms | 10.511ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 86.05µs | -13.5% | -22.8% ⚠︎ | 81.54µs | 132.64µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 209.18µs | -1.1% | +4.7% | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.355ms | -5.1% | -2.6% | 1.198ms | 2.111ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.81µs | -13.9% | -4.9% | 6.32µs | 8.76µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.68µs | -17.8% | +7.1% | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 128.15µs | -18.6% | +14.8% ⚠︎ | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 200.50µs | -12.3% | -4.6% | 175.03µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 411.56µs | +0.3% | -27.1% ⚠︎ | 360.32µs | 634.88µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.262ms | +8.8% | -48.5% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 117.55µs | -5.9% |  | 110.76µs | 165.76µs | 28 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.058ms | -8.0% |  | 1.011ms | 1.471ms | 28 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 535.68µs | -6.5% |  | 509.81µs | 745.85µs | 28 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 128.60µs | -14.5% |  | 128.60µs | 273.39µs | 28 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.144ms | -14.6% |  | 1.144ms | 2.357ms | 28 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 581.91µs | -13.9% |  | 581.91µs | 1.202ms | 28 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 171.90µs | +16.4% |  | 135.97µs | 194.02µs | 28 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.370ms | +1.8% |  | 10.945ms | 16.835ms | 28 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 441.690ms | +35.2% |  | 290.173ms | 638.209ms | 28 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 94.13µs | -21.2% | -55.4% ⚠︎ | 94.13µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 788.33µs | -21.6% | -55.2% ⚠︎ | 788.33µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 405.10µs | -23.9% | -55.6% ⚠︎ | 405.10µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.625ms | +3.3% | +6.7% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.632ms | +5.7% | +8.7% | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.652ms | +8.7% | +14.1% ⚠︎ | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.396ms | -7.9% | -1.9% | 1.376ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 969.24µs | +4.7% | +6.8% | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.462ms | +1.1% | +6.8% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.457ms | +2.8% | +6.8% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 112.34µs | -11.0% | -10.9% ⚠︎ | 110.17µs | 159.52µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.40µs | -5.3% | +2.6% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 754.99µs | +1.9% | +6.4% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 860.87µs | +7.1% | +11.9% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 886.58µs | +9.9% | +11.4% ⚠︎ | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.55µs | -7.2% | -41.7% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.48µs | -3.8% | -96.4% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.57µs | +0.9% | +1.3% | 32.06µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 687.99µs | +6.6% | +10.4% ⚠︎ | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
