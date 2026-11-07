## aui-perf nightly record

_66 points · 2026-09-03T05:27:14.273Z to 2026-11-07T04:28:12.025Z · latest runner: Intel(R) Xeon(R) Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 373.28µs | -9.8% | -46.7% ⚠︎ | 367.63µs | 693.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 526.45µs | -4.9% | -34.6% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 25.32µs | +0.2% | -36.7% ⚠︎ | 23.60µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 300.28µs | -2.6% | -32.5% ⚠︎ | 283.89µs | 443.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.738ms | -0.4% | -31.1% ⚠︎ | 4.419ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 127.59µs | -0.0% | -31.3% ⚠︎ | 118.58µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.179ms | -1.4% | -31.0% ⚠︎ | 1.102ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.703ms | -1.3% | -31.2% ⚠︎ | 4.374ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.36µs | -8.7% | -44.6% ⚠︎ | 4.36µs | 7.80µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 36.02µs | -11.8% | -41.3% ⚠︎ | 36.02µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 141.91µs | -11.7% | -42.4% ⚠︎ | 141.91µs | 245.47µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 37.89µs |  |  | 37.05µs | 37.89µs | 2 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 18.64µs |  |  | 17.92µs | 18.64µs | 2 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 18.17µs |  |  | 17.25µs | 18.17µs | 2 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 139.63µs |  |  | 126.17µs | 139.63µs | 2 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 32.53µs | -1.2% | -19.9% ⚠︎ | 30.81µs | 46.67µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 315.31µs | -3.2% | -20.9% ⚠︎ | 302.25µs | 414.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.39µs | +7.2% | -13.6% ⚠︎ | 3.83µs | 6.38µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.39µs | -0.8% | -13.3% ⚠︎ | 32.88µs | 52.26µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 285.81µs | -6.9% | -54.2% ⚠︎ | 285.01µs | 621.95µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.554ms | -8.8% | -54.5% ⚠︎ | 2.538ms | 5.522ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.061ms | -9.2% | -55.6% ⚠︎ | 9.923ms | 22.539ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 143.42µs | -12.7% | -63.2% ⚠︎ | 142.62µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.346ms | -16.3% | -63.3% ⚠︎ | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 5.326ms | -17.3% | -64.4% ⚠︎ | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 112.88µs | -2.6% |  | 102.57µs | 171.19µs | 16 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 870.29µs | +25.3% |  | 642.90µs | 1.106ms | 16 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 30.02µs | +1.6% | +4.3% | 27.00µs | 36.13µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 303.16µs | -0.6% | -2.8% | 278.66µs | 376.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.567ms | -3.9% | -5.5% | 1.497ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 36.28µs | +12.0% | -5.8% | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 369.71µs | +12.7% | -8.5% | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.946ms | +12.3% | -9.7% | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.92µs | +6.5% | -17.3% ⚠︎ | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 183.00µs | +5.6% | -18.5% ⚠︎ | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 999.66µs | +7.4% | -20.2% ⚠︎ | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | -5.9% | -2.0% | 0.10µs | 0.15µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | -7.1% | -8.3% | 0.19µs | 0.25µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.09µs | -11.1% | -22.2% ⚠︎ | 1.09µs | 1.91µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.27µs | -13.3% | -33.4% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.48µs | +1.7% | -28.7% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 13.39µs | +3.5% | -27.4% ⚠︎ | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.10µs | +15.2% | -15.2% ⚠︎ | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 415.93µs | +14.8% | -26.5% ⚠︎ | 350.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.363ms | +7.6% |  | 1.133ms | 1.847ms | 27 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 79.58µs | -8.9% |  | 79.43µs | 119.72µs | 26 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.776ms | +7.7% |  | 1.434ms | 2.155ms | 27 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 233.50µs | -1.1% |  | 213.31µs | 260.16µs | 27 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 341.87µs | +9.2% |  | 294.65µs | 401.63µs | 27 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 4.087ms | +17.6% |  | 2.767ms | 4.523ms | 27 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 319.48µs | -18.1% |  | 319.30µs | 542.42µs | 26 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.325ms | +8.8% |  | 8.621ms | 12.361ms | 27 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.633ms | +0.8% |  | 1.466ms | 1.886ms | 27 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.131ms | +1.0% |  | 1.047ms | 1.324ms | 27 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.324ms | +2.0% | +8.4% | 1.018ms | 1.575ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.503ms | +3.6% | +0.3% | 1.339ms | 1.701ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.618ms | -4.9% | +9.1% | 7.336ms | 11.964ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 11.140ms | -0.7% | +11.2% ⚠︎ | 8.611ms | 13.597ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 533.86µs | +12.0% | -26.9% ⚠︎ | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.172ms | +6.2% | -3.3% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.486ms | +1.4% | -14.2% ⚠︎ | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.109ms | -0.2% | -1.3% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.121ms | +8.2% | -4.8% | 1.033ms | 1.518ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.037ms | +6.2% | +20.0% ⚠︎ | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 120.74µs | +1.6% | -20.9% ⚠︎ | 112.80µs | 206.73µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.118ms | +0.3% | -18.3% ⚠︎ | 1.045ms | 2.404ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 126.168ms | +1.9% | -24.7% ⚠︎ | 115.601ms | 184.038ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.609ms | +1.3% | -18.7% ⚠︎ | 5.134ms | 9.608ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs | -3.9% | -14.9% ⚠︎ | 0.99µs | 1.46µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.44µs | +10.9% | -5.7% | 4.84µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 24.53µs | +40.8% | +40.6% ⚠︎ | 14.86µs | 38.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.08µs | -19.7% | +1.1% | 2.56µs | 4.17µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.85µs | +12.8% | +19.3% ⚠︎ | 10.31µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 30.35µs | -20.0% | +4.4% | 24.16µs | 45.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 139.03µs | -4.4% | -46.5% ⚠︎ | 139.03µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.063ms | +3.0% | -21.1% ⚠︎ | 1.842ms | 4.550ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.960ms | -2.7% | -7.1% | 12.904ms | 28.415ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 182.087ms | -15.7% | -18.8% ⚠︎ | 181.587ms | 368.431ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 205.56µs | +5.2% | -14.9% ⚠︎ | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 366.35µs | +9.0% | -22.5% ⚠︎ | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.676ms | +8.9% | -24.0% ⚠︎ | 1.438ms | 3.150ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 208.68µs | +11.6% | -26.3% ⚠︎ | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 645.74µs | +19.2% | -32.3% ⚠︎ | 525.40µs | 842.59µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.388ms | +14.1% | -57.3% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 197.68µs | +11.5% | -12.3% ⚠︎ | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 462.55µs | +18.2% | -37.7% ⚠︎ | 369.46µs | 669.46µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.177ms | +18.2% | -69.8% ⚠︎ | 2.554ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 84.84µs | +2.3% | -23.8% ⚠︎ | 81.54µs | 140.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 204.84µs | +9.8% | -12.1% ⚠︎ | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.442ms | +9.1% | -9.9% | 1.198ms | 2.197ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.94µs | +6.5% | -12.1% ⚠︎ | 6.32µs | 9.65µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.79µs | +3.5% | -10.4% ⚠︎ | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 131.72µs | +14.4% | +2.6% | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 196.93µs | +9.7% | -19.6% ⚠︎ | 172.05µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 458.18µs | +13.2% | -27.4% ⚠︎ | 360.32µs | 696.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.426ms | +15.7% | -60.3% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 116.06µs | +0.3% | -30.0% ⚠︎ | 110.76µs | 163.70µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.060ms | -0.2% | -28.0% ⚠︎ | 999.64µs | 1.467ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 535.48µs | +0.1% | -28.2% ⚠︎ | 503.83µs | 742.08µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 125.86µs | -9.9% | -54.0% ⚠︎ | 125.86µs | 269.07µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.157ms | -7.4% | -50.9% ⚠︎ | 1.144ms | 2.356ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 583.09µs | -8.2% | -51.5% ⚠︎ | 581.91µs | 1.190ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 170.10µs | +7.2% | +1.9% | 135.97µs | 194.02µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.138ms | +3.8% | -13.3% ⚠︎ | 10.932ms | 16.835ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 438.114ms | +43.0% | +21.4% ⚠︎ | 290.173ms | 638.209ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 93.28µs | -10.4% | -61.5% ⚠︎ | 93.28µs | 234.82µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 786.61µs | -11.6% | -60.7% ⚠︎ | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 391.90µs | -13.4% | -61.9% ⚠︎ | 391.90µs | 1.025ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.681ms | +2.7% | -3.8% | 1.470ms | 2.200ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.694ms | +3.2% | -4.2% | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.663ms | +4.0% | -0.7% | 1.426ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.397ms | -6.2% | -19.4% ⚠︎ | 1.376ms | 1.840ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 999.65µs | +7.6% | -2.3% | 826.58µs | 1.270ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.453ms | -4.2% | -8.8% | 1.309ms | 1.751ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.472ms | -2.5% | -8.3% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 113.99µs | -2.8% | -17.2% ⚠︎ | 110.17µs | 180.66µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.09µs | -4.5% | -12.9% ⚠︎ | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 756.56µs | -7.1% | -8.8% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 851.00µs | +4.4% | -3.0% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 893.83µs | +7.3% | -1.0% | 715.83µs | 1.027ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.86µs | -5.9% | -46.3% ⚠︎ | 20.86µs | 36.56µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.02µs | -6.6% | -96.9% ⚠︎ | 21.05µs | 680.57µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.71µs | +3.3% | -6.5% | 32.06µs | 46.93µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 684.53µs | -2.8% | -4.5% | 587.81µs | 851.81µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
