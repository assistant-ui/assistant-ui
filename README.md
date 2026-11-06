## aui-perf nightly record

_65 points · 2026-09-03T05:27:14.273Z to 2026-11-06T04:29:10.367Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 384.99µs | -24.6% | -38.4% ⚠︎ | 367.63µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 520.21µs | -11.9% | -25.9% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 23.60µs | -9.2% | -30.9% ⚠︎ | 23.60µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 283.89µs | -8.3% | -25.6% ⚠︎ | 283.89µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.419ms | -6.4% | -25.5% ⚠︎ | 4.419ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 118.58µs | -8.5% | -28.8% ⚠︎ | 118.58µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.102ms | -6.4% | -27.5% ⚠︎ | 1.102ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.374ms | -6.6% | -28.2% ⚠︎ | 4.374ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.43µs | -16.0% | -34.8% ⚠︎ | 4.36µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 37.79µs | -16.0% | -31.7% ⚠︎ | 36.51µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 148.48µs | -13.7% | -32.0% ⚠︎ | 142.67µs | 246.32µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 37.05µs |  |  | 37.05µs | 37.05µs | 1 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 17.92µs |  |  | 17.92µs | 17.92µs | 1 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 17.25µs |  |  | 17.25µs | 17.25µs | 1 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 126.17µs |  |  | 126.17µs | 126.17µs | 1 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 31.29µs | -12.1% | -9.1% | 30.81µs | 46.67µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 310.23µs | -10.6% | -5.7% | 302.25µs | 414.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 3.91µs | -12.8% | -8.5% | 3.83µs | 6.38µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 33.61µs | -9.0% | -4.8% | 32.88µs | 52.26µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 306.43µs | -6.7% | -40.9% ⚠︎ | 285.01µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.782ms | -8.8% | -41.0% ⚠︎ | 2.538ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.388ms | -4.3% | -38.8% ⚠︎ | 9.923ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 157.33µs | -14.1% | -52.0% ⚠︎ | 142.62µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.565ms | -14.0% | -49.1% ⚠︎ | 1.370ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.371ms | -6.1% | -48.4% ⚠︎ | 5.429ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 110.69µs | -4.7% |  | 102.57µs | 171.19µs | 15 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 854.79µs | +22.2% |  | 642.90µs | 1.106ms | 15 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.05µs | -9.6% | +9.6% | 27.00µs | 36.13µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 285.48µs | -12.6% | +8.1% | 278.66µs | 376.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.519ms | -16.7% | +7.3% | 1.497ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 32.27µs | -6.2% | -3.4% | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 323.67µs | -8.5% | -5.4% | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.691ms | -13.1% | -9.1% | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 17.10µs | -19.2% | -16.2% ⚠︎ | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 167.13µs | -20.6% | -15.4% ⚠︎ | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 906.93µs | -20.8% | -16.5% ⚠︎ | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +7.0% | +11.4% ⚠︎ | 0.10µs | 0.15µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -5.6% | +0.9% | 0.19µs | 0.25µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.17µs | -5.4% | -2.7% | 1.10µs | 1.91µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.30µs | -18.9% | -16.9% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.39µs | -22.8% | -21.1% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.25µs | -24.7% | -22.7% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 61.97µs | -19.2% | -18.9% ⚠︎ | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 350.91µs | -27.0% | -26.3% ⚠︎ | 350.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.153ms | -13.6% |  | 1.133ms | 1.847ms | 26 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 81.63µs | -22.5% |  | 79.43µs | 119.72µs | 25 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.522ms | -2.8% |  | 1.434ms | 2.155ms | 26 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 214.82µs | -5.3% |  | 213.31µs | 260.16µs | 26 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 300.01µs | -8.6% |  | 294.65µs | 401.63µs | 26 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.229ms | +6.3% |  | 2.767ms | 4.523ms | 26 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 364.37µs | -24.1% |  | 319.30µs | 542.42µs | 25 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 8.679ms | -12.3% |  | 8.621ms | 12.361ms | 26 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.480ms | -7.5% |  | 1.466ms | 1.886ms | 26 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.080ms | -7.9% |  | 1.047ms | 1.324ms | 26 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.211ms | +12.4% |  | 1.018ms | 1.575ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.368ms | -2.4% |  | 1.339ms | 1.701ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.170ms | +16.0% |  | 7.336ms | 11.964ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.412ms | +15.1% |  | 8.611ms | 13.597ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 471.36µs | -7.8% | -10.0% | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.073ms | -2.2% | +2.1% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.184ms | -1.5% | -3.8% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.131ms | +0.1% | -0.0% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.033ms | -1.9% | -1.8% | 1.033ms | 1.518ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.593ms | -8.2% | -4.1% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 115.42µs | -14.1% | +15.2% ⚠︎ | 112.80µs | 206.73µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.082ms | -11.5% | +14.6% ⚠︎ | 1.045ms | 2.404ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 117.797ms | -22.3% | +1.6% | 115.601ms | 184.038ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.344ms | -16.2% | +13.5% ⚠︎ | 5.134ms | 9.608ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.02µs | -4.0% | +1.5% | 0.99µs | 1.46µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.92µs | -16.5% | -14.8% ⚠︎ | 4.84µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.54µs | -27.7% | -14.1% ⚠︎ | 14.86µs | 38.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.82µs | +41.6% | +45.8% ⚠︎ | 2.56µs | 4.17µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.37µs | +8.2% | +33.2% ⚠︎ | 10.31µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 36.86µs | +42.7% | +45.2% ⚠︎ | 24.16µs | 45.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 144.47µs | -43.5% | -38.8% ⚠︎ | 139.15µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.995ms | -12.8% | +3.7% | 1.842ms | 4.550ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.121ms | -22.8% | +12.1% ⚠︎ | 12.904ms | 28.415ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 230.966ms | -1.8% | +30.1% ⚠︎ | 181.587ms | 368.431ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 185.96µs | -11.0% | -9.4% | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 330.76µs | -6.0% | -9.8% | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.481ms | -22.8% | -3.2% | 1.438ms | 3.150ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 195.51µs | -4.4% | -10.2% ⚠︎ | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 540.60µs | -9.0% | -36.6% ⚠︎ | 525.40µs | 954.53µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.701ms | -6.6% | -42.7% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 187.04µs | -4.9% | -2.0% | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 395.18µs | -9.7% | -37.4% ⚠︎ | 369.46µs | 742.82µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.643ms | -26.0% | -62.0% ⚠︎ | 2.554ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 97.54µs | +6.7% | -1.8% | 81.54µs | 140.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 190.26µs | -1.5% | -5.7% | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.332ms | -14.3% | +1.4% | 1.198ms | 2.197ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.40µs | -13.0% | -3.8% | 6.32µs | 9.65µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.93µs | -19.4% | +2.8% | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 109.83µs | -26.8% | +1.9% | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 172.05µs | -12.7% | -13.8% ⚠︎ | 172.05µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 395.61µs | +0.5% | -23.8% ⚠︎ | 360.32µs | 696.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.189ms | -24.8% | -51.9% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 111.87µs | -9.7% |  | 110.76µs | 165.76µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 999.64µs | -5.8% |  | 999.64µs | 1.471ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 503.83µs | -10.0% |  | 503.83µs | 745.85µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 134.09µs | -11.7% |  | 128.60µs | 273.39µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.148ms | -14.6% |  | 1.144ms | 2.357ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 603.81µs | -11.9% |  | 581.91µs | 1.202ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 148.28µs | +2.1% |  | 135.97µs | 194.02µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 10.932ms | -17.8% |  | 10.932ms | 16.835ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 298.163ms | -11.1% |  | 290.173ms | 638.209ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 103.58µs | -15.3% | -48.6% ⚠︎ | 94.13µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 873.71µs | -15.6% | -46.9% ⚠︎ | 788.33µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 444.88µs | -17.3% | -48.1% ⚠︎ | 405.10µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.693ms | +9.6% | +14.4% ⚠︎ | 1.470ms | 2.200ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.646ms | +4.9% | +10.4% ⚠︎ | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.623ms | +5.8% | +12.4% ⚠︎ | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.490ms | -1.1% | +7.0% | 1.376ms | 1.840ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 966.71µs | +7.0% | +11.1% ⚠︎ | 826.58µs | 1.270ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.466ms | +3.1% | +6.2% | 1.309ms | 1.751ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.468ms | +1.4% | +5.1% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 114.19µs | -11.1% | +2.4% | 110.17µs | 180.66µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.84µs | -0.1% | +3.7% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 790.18µs | +5.8% | +10.3% ⚠︎ | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 789.04µs | -0.8% | +8.6% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 779.79µs | +0.9% | +4.1% | 715.83µs | 1.027ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.89µs | -2.3% | -36.6% ⚠︎ | 20.86µs | 40.71µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.41µs | -3.9% | -96.3% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.23µs | -9.7% | +0.4% | 32.06µs | 46.93µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 643.41µs | +1.2% | +5.1% | 587.81µs | 851.81µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
