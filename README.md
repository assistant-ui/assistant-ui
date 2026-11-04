## aui-perf nightly record

_63 points · 2026-09-03T05:27:14.273Z to 2026-11-04T04:28:37.989Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 402.61µs | -32.0% | -32.9% ⚠︎ | 367.63µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 548.59µs | -22.8% | -18.9% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 24.87µs | -16.6% | -25.0% ⚠︎ | 23.89µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 311.49µs | -10.6% | -15.2% ⚠︎ | 286.42µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.758ms | -11.9% | -17.0% ⚠︎ | 4.549ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 124.41µs | -12.2% | -19.6% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.157ms | -14.0% | -19.0% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.654ms | -16.5% | -18.6% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.69µs | -24.5% | -29.3% ⚠︎ | 4.36µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 40.07µs | -20.0% | -26.4% ⚠︎ | 36.51µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 156.70µs | -22.0% | -27.1% ⚠︎ | 142.67µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 32.63µs | -23.4% |  | 30.81µs | 46.67µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 321.96µs | -21.0% |  | 302.25µs | 414.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.03µs | -20.8% |  | 3.83µs | 6.38µs | 30 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.81µs | -19.8% |  | 32.88µs | 48.58µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 311.91µs | -13.6% | -38.6% ⚠︎ | 285.01µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.826ms | -10.2% | -38.5% ⚠︎ | 2.538ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.113ms | -13.3% | -39.2% ⚠︎ | 9.923ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 163.98µs | -15.8% | -49.5% ⚠︎ | 142.62µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.616ms | -12.5% | -46.6% ⚠︎ | 1.370ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.439ms | -13.5% | -46.4% ⚠︎ | 5.429ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 115.34µs | -19.4% |  | 102.57µs | 143.16µs | 13 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 867.41µs | -5.0% |  | 642.90µs | 1.001ms | 13 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.80µs | -15.1% | +20.3% ⚠︎ | 24.63µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 298.84µs | -19.6% | +16.4% ⚠︎ | 264.18µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.604ms | -23.5% | +14.6% ⚠︎ | 1.407ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 31.95µs | -19.3% | -4.7% | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 322.63µs | -20.8% | -5.1% | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.710ms | -24.9% | -8.2% | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 17.45µs | -29.6% | -12.7% ⚠︎ | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 171.23µs | -29.8% | -12.6% ⚠︎ | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 919.01µs | -28.7% | -12.9% ⚠︎ | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +1.4% | +19.9% ⚠︎ | 0.10µs | 0.13µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | -9.0% | +10.8% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.20µs | -15.3% | +2.6% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.30µs | -33.2% | -13.8% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.43µs | -35.2% | -15.7% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.86µs | -37.1% | -14.3% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 64.95µs | -27.3% | -15.1% ⚠︎ | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 366.13µs | -33.0% | -22.8% ⚠︎ | 352.03µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.224ms | -16.0% |  | 1.133ms | 1.847ms | 24 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 85.41µs | -28.7% |  | 79.43µs | 119.72µs | 23 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.610ms | -9.4% |  | 1.434ms | 2.155ms | 24 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 229.20µs | -11.9% |  | 213.31µs | 260.16µs | 24 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 315.45µs | -16.0% |  | 294.65µs | 401.63µs | 24 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.368ms | +0.9% |  | 2.767ms | 4.523ms | 24 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 378.89µs | -29.8% |  | 319.30µs | 542.42µs | 23 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.036ms | -22.7% |  | 8.621ms | 12.361ms | 24 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.564ms | -16.6% |  | 1.466ms | 1.877ms | 24 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.113ms | -13.4% |  | 1.047ms | 1.324ms | 24 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.264ms | -0.7% |  | 1.018ms | 1.332ms | 29 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.415ms | -4.7% |  | 1.339ms | 1.583ms | 29 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.753ms | +1.0% |  | 7.336ms | 10.113ms | 29 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.945ms | +4.5% |  | 8.611ms | 11.220ms | 29 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 465.83µs | -61.2% | -7.4% | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.085ms | -33.6% | +6.2% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.399ms | -43.8% | +3.6% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.114ms | -9.8% | -1.1% | 1.104ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.033ms | -18.4% | -2.2% | 1.033ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.973ms | +11.6% | +16.5% ⚠︎ | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 117.84µs | -21.0% |  | 100.23µs | 161.14µs | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.151ms | -21.8% |  | 944.27µs | 1.503ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 122.864ms | -20.7% |  | 115.601ms | 170.961ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.752ms | -17.3% |  | 4.707ms | 9.051ms | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.05µs | -28.4% |  | 0.99µs | 1.46µs | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.20µs | -50.9% |  | 4.84µs | 10.60µs | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 18.44µs | -52.0% |  | 14.86µs | 38.41µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.85µs | +36.2% | +53.1% ⚠︎ | 2.56µs | 4.03µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.97µs | +5.8% | +20.4% ⚠︎ | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 37.95µs | +36.2% | +56.0% ⚠︎ | 24.16µs | 39.56µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 154.14µs | -40.8% | -32.8% ⚠︎ | 139.15µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.979ms | -49.4% | +5.3% | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.539ms | -36.3% | +21.4% ⚠︎ | 12.268ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 220.202ms | -24.5% | +19.9% ⚠︎ | 177.541ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 190.68µs | -26.0% | -4.5% | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 325.48µs | -32.5% | -7.9% | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.519ms | -48.7% | +1.6% | 1.438ms | 2.961ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 186.53µs | -38.4% | -7.3% | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 539.72µs | -31.1% | -32.5% ⚠︎ | 525.40µs | 954.53µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.693ms | -69.1% | -55.5% ⚠︎ | 4.475ms | 15.187ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 172.70µs | -29.6% | -7.4% | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 386.17µs | -25.6% | -38.1% ⚠︎ | 369.46µs | 742.82µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.728ms | -67.9% | -57.1% ⚠︎ | 2.554ms | 10.511ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 84.35µs | -36.4% | +0.6% | 81.54µs | 132.64µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 187.07µs | -34.6% | -0.2% | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.327ms | -37.2% | +1.2% | 1.198ms | 2.111ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.63µs | -24.3% | +1.3% | 6.32µs | 8.76µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.18µs | -33.2% | +4.3% | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 112.49µs | -40.2% | +6.3% | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 178.77µs | -23.8% | -3.5% | 175.03µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 380.31µs | -30.4% | -27.3% ⚠︎ | 360.32µs | 634.88µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.842ms | -67.3% | -52.8% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 115.06µs | -26.4% |  | 110.76µs | 165.76µs | 29 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.045ms | -23.8% |  | 1.011ms | 1.471ms | 29 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 535.25µs | -25.4% |  | 509.81µs | 745.85µs | 29 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 136.95µs | -26.8% |  | 128.60µs | 273.39µs | 29 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.240ms | -25.8% |  | 1.144ms | 2.357ms | 29 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 625.20µs | -25.1% |  | 581.91µs | 1.202ms | 29 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 156.12µs | -12.3% |  | 135.97µs | 194.02µs | 29 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.754ms | -30.0% |  | 10.945ms | 16.835ms | 29 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 307.584ms | -16.5% |  | 290.173ms | 638.209ms | 29 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 105.05µs | -31.1% | -48.8% ⚠︎ | 94.13µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 890.28µs | -29.4% | -47.6% ⚠︎ | 788.33µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 450.82µs | -34.1% | -48.9% ⚠︎ | 405.10µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.636ms | -24.3% | +7.9% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.621ms | -23.2% | +5.0% | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.583ms | -23.7% | +6.7% | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.447ms | -13.6% | +4.6% | 1.376ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 935.97µs | -19.2% | +8.8% | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.470ms | -15.6% | +9.9% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.479ms | -18.1% | +9.7% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 120.73µs | -24.3% | +0.9% | 110.17µs | 159.52µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 65.90µs | -8.4% | +6.9% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 791.78µs | -15.3% | +14.2% ⚠︎ | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 803.88µs | -5.5% | +4.4% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 806.94µs | -10.1% | +5.2% | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.96µs | -2.2% | -33.5% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.58µs | -3.9% | -96.2% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.75µs | -25.7% | +4.7% | 32.06µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 655.05µs | -6.1% | +6.4% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
