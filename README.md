## aui-perf nightly record

_61 points · 2026-09-03T05:27:14.273Z to 2026-11-02T04:29:13.769Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 378.25µs | -18.7% | -37.6% ⚠︎ | 378.25µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 519.71µs | -3.8% | -28.4% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 23.89µs | -4.0% | -28.9% ⚠︎ | 23.89µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 286.42µs | -2.0% | -21.4% ⚠︎ | 286.42µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.549ms | -0.2% | -19.5% ⚠︎ | 4.549ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 120.94µs | +0.1% | -22.2% ⚠︎ | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.125ms | -0.1% | -19.9% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.510ms | +0.2% | -20.6% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.40µs | -8.4% | -35.7% ⚠︎ | 4.40µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 37.56µs | -5.7% | -32.1% ⚠︎ | 37.56µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 147.36µs | -6.0% | -31.5% ⚠︎ | 147.36µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 30.81µs | -7.9% |  | 30.81µs | 46.67µs | 28 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 302.25µs | -5.1% |  | 302.25µs | 414.32µs | 28 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 3.83µs | -9.5% |  | 3.83µs | 6.38µs | 28 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 32.88µs | -8.3% |  | 32.88µs | 48.58µs | 28 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 291.85µs | -5.8% | -43.5% ⚠︎ | 291.85µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.634ms | -3.2% | -42.5% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.409ms | -3.5% | -42.8% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 159.48µs | -9.6% | -49.8% ⚠︎ | 158.03µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.544ms | -4.0% | -46.7% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.170ms | -4.4% | -45.6% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 110.48µs | +4.1% |  | 106.15µs | 143.16µs | 11 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 648.17µs | -14.6% |  | 642.90µs | 1.001ms | 11 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.00µs | -1.6% | +5.2% | 23.95µs | 34.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 278.66µs | -8.3% | +8.0% | 256.80µs | 371.73µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.497ms | -8.5% | +6.6% | 1.400ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 29.73µs | -8.1% | -25.0% ⚠︎ | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 302.89µs | -8.7% | -23.7% ⚠︎ | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.603ms | -11.3% | -26.1% ⚠︎ | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 16.17µs | -16.2% | -32.6% ⚠︎ | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 159.22µs | -14.4% | -30.8% ⚠︎ | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 858.96µs | -16.5% | -34.1% ⚠︎ | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +12.3% | +4.9% | 0.10µs | 0.13µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +7.4% | +1.2% | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.14µs | -3.4% | -0.9% | 1.10µs | 1.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.29µs | -15.5% | -11.7% ⚠︎ | 0.29µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.36µs | -24.7% | -35.3% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.05µs | -25.1% | -37.4% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 60.37µs | -14.8% | -24.4% ⚠︎ | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 352.03µs | -24.4% | -31.5% ⚠︎ | 352.03µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.146ms | -7.6% |  | 1.133ms | 1.847ms | 22 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 81.63µs | -15.5% |  | 81.63µs | 119.72µs | 21 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.508ms | +5.2% |  | 1.434ms | 2.155ms | 22 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 213.31µs | -0.5% |  | 213.31µs | 260.16µs | 22 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 294.65µs | -4.7% |  | 294.65µs | 401.63µs | 22 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.191ms | +4.9% |  | 2.767ms | 4.523ms | 22 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 365.78µs | -19.8% |  | 358.89µs | 542.42µs | 21 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 8.621ms | -7.9% |  | 8.621ms | 12.361ms | 22 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.466ms | -2.7% |  | 1.466ms | 1.877ms | 22 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.047ms | -3.2% |  | 1.047ms | 1.324ms | 22 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.192ms | +16.5% |  | 1.018ms | 1.299ms | 27 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.339ms | -4.0% |  | 1.339ms | 1.583ms | 27 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.175ms | +25.0% |  | 7.336ms | 10.113ms | 27 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.303ms | +19.6% |  | 8.611ms | 11.220ms | 27 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 447.66µs | -13.4% | -33.6% ⚠︎ | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.044ms | +2.1% | -10.0% ⚠︎ | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.140ms | +1.8% | -6.1% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.171ms | +5.0% | +6.9% | 1.104ms | 1.235ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.039ms | -2.1% | -4.0% | 1.037ms | 1.266ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.751ms | -6.2% | +24.0% ⚠︎ | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 112.80µs | -7.5% |  | 100.23µs | 161.14µs | 28 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.060ms | -5.7% |  | 944.27µs | 1.503ms | 28 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 115.601ms | -10.2% |  | 115.601ms | 170.961ms | 28 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.349ms | -4.8% |  | 4.707ms | 9.051ms | 28 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.00µs | -0.5% |  | 0.99µs | 1.46µs | 28 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.84µs | -13.1% |  | 4.84µs | 10.60µs | 28 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.07µs | -15.1% |  | 14.86µs | 38.41µs | 28 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.76µs | +46.4% | +17.2% ⚠︎ | 2.51µs | 4.03µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.14µs | +15.6% | -2.7% | 10.04µs | 13.93µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 36.94µs | +51.5% | +20.2% ⚠︎ | 24.16µs | 39.56µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 139.15µs | -38.3% | -51.7% ⚠︎ | 139.15µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.916ms | -11.1% | -7.3% | 1.842ms | 3.911ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.632ms | -5.7% | +8.4% | 11.980ms | 22.808ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 209.883ms | -3.9% | +30.6% ⚠︎ | 177.541ms | 291.583ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 188.81µs | -1.5% | -29.5% ⚠︎ | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 321.19µs | +2.1% | -28.2% ⚠︎ | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.445ms | -7.4% | -34.0% ⚠︎ | 1.438ms | 2.961ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 181.10µs | -5.4% | -28.7% ⚠︎ | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 525.40µs | -2.3% | -46.2% ⚠︎ | 525.40µs | 954.53µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.625ms | +0.4% | -60.8% ⚠︎ | 4.475ms | 15.187ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 169.36µs | -9.1% | -36.8% ⚠︎ | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 390.43µs | +0.9% | -53.0% ⚠︎ | 369.46µs | 742.82µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.554ms | -7.5% | -71.3% ⚠︎ | 2.554ms | 10.511ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 89.20µs | +2.1% | -13.7% ⚠︎ | 81.54µs | 132.64µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 173.27µs | -9.4% | -26.3% ⚠︎ | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.198ms | -7.6% | -26.3% ⚠︎ | 1.198ms | 2.111ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.32µs | -5.6% | -15.4% ⚠︎ | 6.32µs | 8.76µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.70µs | -14.1% | -7.5% | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 106.13µs | -23.9% | -0.1% | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 175.03µs | -8.3% | -17.2% ⚠︎ | 175.03µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 375.74µs | -5.1% | -41.6% ⚠︎ | 360.32µs | 634.88µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.816ms | -6.7% | -63.5% ⚠︎ | 2.568ms | 8.693ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 111.53µs | -0.8% |  | 110.76µs | 165.76µs | 27 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.011ms | -0.8% |  | 1.011ms | 1.471ms | 27 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 509.81µs | -0.6% |  | 509.81µs | 745.85µs | 27 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 128.63µs | -4.9% |  | 128.63µs | 273.39µs | 27 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.171ms | -2.8% |  | 1.171ms | 2.357ms | 27 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 596.40µs | -2.7% |  | 596.40µs | 1.202ms | 27 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 148.04µs | +8.8% |  | 135.97µs | 194.02µs | 27 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 10.945ms | -8.4% |  | 10.945ms | 16.835ms | 27 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 290.173ms | -7.1% |  | 290.173ms | 638.209ms | 27 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 98.54µs | -8.4% | -46.8% ⚠︎ | 98.54µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 835.48µs | -10.0% | -46.6% ⚠︎ | 835.48µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 428.04µs | -9.4% | -47.7% ⚠︎ | 428.04µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.515ms | -22.7% | -3.4% | 1.470ms | 2.162ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.513ms | -19.1% | -5.3% | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.476ms | -18.9% | -2.8% | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.376ms | -0.9% | -6.3% | 1.376ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 874.69µs | +5.8% | -11.3% ⚠︎ | 826.58µs | 1.159ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.406ms | +7.4% | +0.2% | 1.309ms | 1.742ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.389ms | +6.3% | -0.2% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 110.17µs | -0.2% | -4.1% | 110.17µs | 159.52µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.87µs | +4.9% | -0.1% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 741.23µs | +7.5% | +2.4% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 747.65µs | +4.9% | -7.8% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 758.81µs | +6.0% | -8.7% | 715.83µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.02µs | +5.5% | -40.3% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.42µs | +5.7% | -96.7% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.06µs | -1.7% | -4.8% | 32.06µs | 45.40µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 636.52µs | +8.3% | +2.0% | 587.81µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
