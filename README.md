## aui-perf nightly record

_64 points · 2026-09-03T05:27:14.273Z to 2026-11-05T04:30:03.778Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 474.27µs | -16.2% | -21.0% ⚠︎ | 367.63µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 754.99µs | +17.7% | +12.6% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 31.87µs | +13.8% | -3.0% | 23.89µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 355.02µs | +9.4% | -4.2% | 286.42µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.869ms | +16.3% | +3.0% | 4.549ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 144.21µs | +5.0% | -6.9% | 120.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.431ms | +13.8% | -0.5% | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.126ms | +17.2% | +6.3% | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.12µs | -0.6% | -7.2% | 4.36µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 50.08µs | +8.5% | -9.7% | 36.51µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 181.26µs | -5.8% | -18.0% ⚠︎ | 142.67µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 40.44µs | -2.8% |  | 30.81µs | 46.67µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 375.39µs | +1.6% |  | 302.25µs | 414.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.07µs | -4.9% |  | 3.83µs | 6.38µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 52.26µs | +25.0% |  | 32.88µs | 52.26µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 404.94µs | +16.2% | -21.2% ⚠︎ | 285.01µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.130ms | +37.8% | -11.5% ⚠︎ | 2.538ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 15.254ms | +35.1% | -17.9% ⚠︎ | 9.923ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 237.31µs | +10.1% | -27.6% ⚠︎ | 142.62µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.407ms | +40.1% | -22.9% ⚠︎ | 1.370ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 9.578ms | +38.1% | -23.6% ⚠︎ | 5.429ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 171.19µs | +42.3% |  | 102.57µs | 171.19µs | 14 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.106ms | +10.5% |  | 642.90µs | 1.106ms | 14 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 36.13µs | +5.5% | +46.7% ⚠︎ | 24.68µs | 36.13µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 376.19µs | +6.7% | +41.4% ⚠︎ | 264.18µs | 376.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.003ms | -3.0% | +42.3% ⚠︎ | 1.416ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 38.77µs | -10.7% | +15.6% ⚠︎ | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 402.94µs | -6.8% | +17.8% ⚠︎ | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.157ms | -9.3% | +16.2% ⚠︎ | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 22.14µs | -14.9% | +8.4% | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 209.68µs | -16.8% | +4.3% | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.081ms | -24.1% | +1.6% | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.15µs | +28.5% | +49.8% ⚠︎ | 0.10µs | 0.15µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.25µs | +16.3% | +23.5% ⚠︎ | 0.19µs | 0.25µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.91µs | +61.8% | +58.2% ⚠︎ | 1.10µs | 1.91µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | -28.0% | +4.6% | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.66µs | -27.2% | -6.4% | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.12µs | -26.7% | -6.2% | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 93.91µs | -2.8% | +22.9% ⚠︎ | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 452.73µs | -22.8% | -8.8% | 352.03µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.460ms | -20.9% |  | 1.133ms | 1.847ms | 25 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 92.76µs | -11.8% |  | 79.43µs | 119.72µs | 24 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.747ms | -18.9% |  | 1.434ms | 2.155ms | 25 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 255.90µs | +1.3% |  | 213.31µs | 260.16µs | 25 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 352.94µs | -12.1% |  | 294.65µs | 401.63µs | 25 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.715ms | -10.7% |  | 2.767ms | 4.523ms | 25 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 419.52µs | -7.7% |  | 319.30µs | 542.42µs | 24 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.481ms | -4.2% |  | 8.621ms | 12.361ms | 25 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.886ms | +1.9% |  | 1.466ms | 1.886ms | 25 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.287ms | -2.8% |  | 1.047ms | 1.324ms | 25 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.575ms | +32.2% |  | 1.018ms | 1.575ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.701ms | +7.5% |  | 1.339ms | 1.701ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 11.964ms | +45.9% |  | 7.336ms | 11.964ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 13.597ms | +40.9% |  | 8.611ms | 13.597ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 702.33µs | -7.9% | +35.6% ⚠︎ | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.532ms | +14.9% | +47.0% ⚠︎ | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 7.029ms | +42.4% | +62.4% ⚠︎ | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.311ms | +7.4% | +17.7% ⚠︎ | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.518ms | +31.5% | +42.0% ⚠︎ | 1.033ms | 1.518ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.141ms | +38.7% | +14.2% ⚠︎ | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 206.73µs | +46.0% |  | 100.23µs | 206.73µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.404ms | +79.6% |  | 944.27µs | 2.404ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 184.038ms | +13.1% |  | 115.601ms | 184.038ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 9.608ms | +6.2% |  | 4.707ms | 9.608ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.26µs | +4.6% |  | 0.99µs | 1.46µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 8.53µs | +34.9% |  | 4.84µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 33.10µs | +7.3% |  | 14.86µs | 38.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.17µs | +28.4% | +61.8% ⚠︎ | 2.56µs | 4.17µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 21.12µs | +51.6% | +108.2% ⚠︎ | 10.04µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 45.20µs | +43.8% | +82.2% ⚠︎ | 24.16µs | 45.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 244.88µs | -23.7% | +8.6% | 139.15µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.550ms | +46.5% | +137.4% ⚠︎ | 1.842ms | 4.550ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 28.415ms | +60.1% | +131.6% ⚠︎ | 12.592ms | 28.415ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 368.431ms | +66.4% | +98.7% ⚠︎ | 177.541ms | 368.431ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 270.21µs | -8.2% | +26.5% ⚠︎ | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 479.70µs | -3.4% | +22.3% ⚠︎ | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.150ms | +38.0% | +98.7% ⚠︎ | 1.438ms | 3.150ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 283.98µs | +3.9% | +22.2% ⚠︎ | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 826.83µs | +13.3% | -1.8% | 525.40µs | 954.53µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 17.584ms | +83.6% | +70.3% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 284.63µs | -11.0% | +51.8% ⚠︎ | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 533.50µs | -8.1% | -15.6% ⚠︎ | 369.46µs | 742.82µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 11.452ms | +114.6% | +71.1% ⚠︎ | 2.554ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 140.55µs | +8.5% | +45.3% ⚠︎ | 81.54µs | 140.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 269.47µs | -0.2% | +42.3% ⚠︎ | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.197ms | +33.1% | +70.2% ⚠︎ | 1.198ms | 2.197ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 9.65µs | +14.2% | +42.1% ⚠︎ | 6.32µs | 9.65µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 20.69µs | -2.3% | +37.2% ⚠︎ | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 142.68µs | -12.7% | +34.2% ⚠︎ | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 243.47µs | -20.4% | +30.3% ⚠︎ | 175.03µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 696.29µs | +9.7% | +22.4% ⚠︎ | 360.32µs | 696.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 15.054ms | +134.7% | +150.2% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 145.22µs | -3.6% |  | 110.76µs | 165.76µs | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.318ms | -0.4% |  | 1.011ms | 1.471ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 634.63µs | -6.5% |  | 509.81µs | 745.85µs | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 169.68µs | +5.3% |  | 128.60µs | 273.39µs | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.570ms | +6.8% |  | 1.144ms | 2.357ms | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 800.55µs | +5.7% |  | 581.91µs | 1.202ms | 30 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 169.92µs | -12.4% |  | 135.97µs | 194.02µs | 30 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 15.382ms | -8.6% |  | 10.945ms | 16.835ms | 30 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 415.798ms | -18.6% |  | 290.173ms | 638.209ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 134.22µs | +2.3% | -36.9% ⚠︎ | 94.13µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.158ms | +17.6% | -32.5% ⚠︎ | 788.33µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 630.71µs | +25.7% | -29.7% ⚠︎ | 405.10µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.200ms | +27.8% | +44.7% ⚠︎ | 1.470ms | 2.200ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.964ms | +18.7% | +29.3% ⚠︎ | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.009ms | +26.8% | +36.4% ⚠︎ | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.840ms | +11.9% | +31.4% ⚠︎ | 1.376ms | 1.840ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.270ms | +20.1% | +43.5% ⚠︎ | 826.58µs | 1.270ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.751ms | +9.7% | +26.9% ⚠︎ | 1.309ms | 1.751ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.684ms | +10.7% | +19.0% ⚠︎ | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 180.66µs | +54.0% | +56.4% ⚠︎ | 110.17µs | 180.66µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 73.47µs | +13.9% | +17.3% ⚠︎ | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 866.38µs | +9.8% | +19.0% ⚠︎ | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.030ms | -3.1% | +33.4% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.027ms | +9.9% | +37.0% ⚠︎ | 715.83µs | 1.027ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 29.25µs | +17.0% | -17.6% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 30.55µs | +22.4% | -95.2% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 46.93µs | +24.0% | +42.2% ⚠︎ | 32.06µs | 46.93µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 851.81µs | +22.8% | +35.1% ⚠︎ | 587.81µs | 851.81µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
