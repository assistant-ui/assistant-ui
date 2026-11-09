## aui-perf nightly record

_68 points · 2026-09-03T05:27:14.273Z to 2026-11-09T04:30:21.629Z · latest runner: AMD EPYC · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 375.95µs | -0.6% | -42.3% ⚠︎ | 367.63µs | 693.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 516.00µs | -0.7% | -27.5% ⚠︎ | 516.00µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 23.73µs | -0.7% | -32.5% ⚠︎ | 23.60µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 287.24µs | +0.3% | -26.5% ⚠︎ | 283.89µs | 443.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.498ms | -1.1% | -25.8% ⚠︎ | 4.419ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 119.90µs | -0.9% | -25.4% ⚠︎ | 118.58µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.120ms | -0.5% | -23.7% ⚠︎ | 1.102ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.535ms | +0.5% | -23.0% ⚠︎ | 4.374ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.37µs | -0.8% | -37.7% ⚠︎ | 4.36µs | 7.80µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 37.34µs | -0.6% | -34.8% ⚠︎ | 36.02µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 146.96µs | -0.3% | -34.9% ⚠︎ | 141.91µs | 245.47µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 35.87µs |  |  | 35.87µs | 37.89µs | 4 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 17.71µs |  |  | 17.71µs | 18.64µs | 4 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 16.08µs |  |  | 16.08µs | 18.17µs | 4 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 123.04µs |  |  | 123.04µs | 139.63µs | 4 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 30.82µs | +0.0% | -13.1% ⚠︎ | 30.81µs | 46.67µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 302.91µs | +0.2% | -13.9% ⚠︎ | 302.25µs | 414.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 3.81µs | -0.6% | -14.0% ⚠︎ | 3.81µs | 6.38µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 32.90µs | +0.1% | -10.7% ⚠︎ | 32.88µs | 52.26µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 289.62µs | -0.8% | -48.6% ⚠︎ | 285.01µs | 621.95µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.626ms | -0.3% | -48.0% ⚠︎ | 2.538ms | 5.522ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.385ms | -0.2% | -48.2% ⚠︎ | 9.923ms | 22.539ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 153.48µs | -3.8% | -55.7% ⚠︎ | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.496ms | -3.1% | -54.3% ⚠︎ | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 5.949ms | -3.6% | -52.9% ⚠︎ | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 109.13µs | -1.2% |  | 102.57µs | 171.19µs | 18 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 786.03µs | +21.3% |  | 642.90µs | 1.106ms | 18 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 26.72µs | -1.1% | -7.6% | 26.72µs | 36.13µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 278.76µs | +0.0% | -15.6% ⚠︎ | 278.66µs | 376.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.498ms | +0.0% | -13.9% ⚠︎ | 1.497ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 30.49µs | +2.6% | -11.1% ⚠︎ | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 310.12µs | +2.4% | -11.5% ⚠︎ | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.644ms | +2.6% | -13.9% ⚠︎ | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 16.04µs | -0.8% | -24.7% ⚠︎ | 16.04µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 158.01µs | -0.8% | -24.5% ⚠︎ | 158.01µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 851.76µs | -0.8% | -25.4% ⚠︎ | 851.76µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -1.9% | +10.0% ⚠︎ | 0.10µs | 0.15µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -4.7% | -4.7% | 0.19µs | 0.25µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.12µs | -1.4% | -7.0% | 1.09µs | 1.91µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.30µs | +3.1% | -14.3% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.38µs | +1.5% | -22.0% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 12.04µs | -0.1% | -24.6% ⚠︎ | 12.04µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 59.12µs | -2.1% | -23.3% ⚠︎ | 59.12µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 346.91µs | -1.5% | -28.8% ⚠︎ | 346.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.133ms | -1.2% |  | 1.133ms | 1.847ms | 29 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 80.92µs | -0.9% |  | 79.43µs | 119.72µs | 28 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.498ms | -0.7% |  | 1.434ms | 2.155ms | 29 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 211.20µs | -1.0% |  | 211.20µs | 260.16µs | 29 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 288.59µs | -2.1% |  | 288.59µs | 401.63µs | 29 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.149ms | -1.3% |  | 2.767ms | 4.523ms | 29 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 361.74µs | -1.1% |  | 319.30µs | 542.42µs | 28 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 8.393ms | -2.6% |  | 8.393ms | 12.361ms | 29 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.456ms | -0.7% |  | 1.456ms | 1.886ms | 29 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.041ms | -0.6% |  | 1.041ms | 1.324ms | 29 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.186ms | -0.5% | +10.2% ⚠︎ | 1.023ms | 1.575ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.335ms | -0.3% | -4.0% | 1.335ms | 1.701ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.073ms | -1.1% | +11.3% ⚠︎ | 7.343ms | 11.964ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.256ms | -0.5% | +7.1% | 8.611ms | 13.597ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 440.23µs | -1.7% | -20.5% ⚠︎ | 440.23µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.050ms | +0.6% | +2.5% | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.115ms | -0.6% | -4.3% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.191ms | +1.7% | +5.5% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.027ms | -1.1% | -1.3% | 1.027ms | 1.518ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.787ms | +1.3% | +0.0% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 114.09µs | +1.1% | -2.3% | 112.80µs | 206.73µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.069ms | +0.8% | +0.5% | 1.051ms | 2.404ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 115.765ms | +0.1% | -14.8% ⚠︎ | 115.601ms | 184.038ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.344ms | -0.1% | -1.9% | 5.134ms | 9.608ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs | +0.6% | -0.3% | 0.99µs | 1.46µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 4.82µs | -0.3% | -15.0% ⚠︎ | 4.82µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 16.92µs | -0.9% | -14.0% ⚠︎ | 14.86µs | 38.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.71µs | -1.4% | +39.6% ⚠︎ | 2.56µs | 4.17µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.03µs | -0.9% | +13.0% ⚠︎ | 10.50µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 36.48µs | -1.3% | +43.8% ⚠︎ | 24.16µs | 45.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 138.29µs | -0.6% | -40.5% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.854ms | -3.3% | -14.7% ⚠︎ | 1.854ms | 4.550ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.959ms | +2.4% | +1.7% | 13.202ms | 28.415ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 207.959ms | -0.9% | +6.0% | 181.587ms | 368.431ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 186.07µs | -1.5% | -23.1% ⚠︎ | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 315.10µs | -1.9% | -27.9% ⚠︎ | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.423ms | -1.6% | -13.2% ⚠︎ | 1.423ms | 3.150ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 180.48µs | -0.3% | -22.7% ⚠︎ | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 534.65µs | +1.8% | -36.5% ⚠︎ | 525.40µs | 826.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.782ms | +3.4% | -55.3% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 165.84µs | -2.1% | -25.3% ⚠︎ | 165.84µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 365.89µs | -6.3% | -45.3% ⚠︎ | 365.89µs | 612.18µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.541ms | -0.5% | -62.6% ⚠︎ | 2.541ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 84.15µs | -5.7% | -19.1% ⚠︎ | 81.54µs | 140.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 176.94µs | +2.1% | -20.0% ⚠︎ | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.158ms | -3.3% | -21.6% ⚠︎ | 1.158ms | 2.197ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.31µs | -0.1% | -10.7% ⚠︎ | 6.31µs | 9.65µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.38µs | -2.2% | -10.4% ⚠︎ | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 101.89µs | -4.0% | -12.9% ⚠︎ | 101.89µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 179.29µs | +2.4% | -12.1% ⚠︎ | 172.05µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 369.62µs | -1.6% | -37.2% ⚠︎ | 360.32µs | 696.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.728ms | -3.1% | -64.5% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 108.91µs | -2.4% | -24.5% ⚠︎ | 108.91µs | 163.70µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.002ms | -0.8% | -22.3% ⚠︎ | 999.64µs | 1.467ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 506.55µs | -0.6% | -22.0% ⚠︎ | 503.83µs | 742.08µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 128.47µs | -0.1% | -45.4% ⚠︎ | 125.86µs | 269.07µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.160ms | -1.0% | -44.2% ⚠︎ | 1.144ms | 2.356ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 585.67µs | -1.8% | -43.7% ⚠︎ | 581.91µs | 1.190ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 146.98µs | -0.7% | -1.3% | 135.97µs | 194.02µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 10.972ms | +0.2% | -15.5% ⚠︎ | 10.932ms | 16.835ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 294.483ms | +1.5% | -8.5% | 290.173ms | 638.209ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 98.43µs | -0.1% | -53.7% ⚠︎ | 93.28µs | 234.82µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 845.25µs | +1.2% | -52.6% ⚠︎ | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 431.23µs | +0.7% | -51.7% ⚠︎ | 391.90µs | 1.025ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.509ms | -0.4% | -5.8% | 1.470ms | 2.200ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.517ms | +0.2% | -7.3% | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.464ms | -0.8% | -7.3% | 1.433ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.368ms | -0.6% | -8.2% | 1.368ms | 1.840ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 866.42µs | -0.9% | -7.7% | 826.58µs | 1.270ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.394ms | -0.8% | -4.4% | 1.309ms | 1.751ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.382ms | -0.5% | -5.4% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 113.51µs | +3.0% | -1.3% | 110.17µs | 180.66µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.18µs | -1.1% | +0.6% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 736.21µs | -0.7% | -4.5% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 756.24µs | +1.1% | -5.9% | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 763.62µs | +0.6% | -6.7% | 715.83µs | 1.027ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.71µs | -1.4% | -40.6% ⚠︎ | 20.86µs | 29.25µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.31µs | -0.5% | -96.7% ⚠︎ | 21.05µs | 30.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.78µs | +2.2% | -4.5% | 32.06µs | 46.93µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 635.40µs | -0.2% | -4.0% | 587.81µs | 851.81µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
