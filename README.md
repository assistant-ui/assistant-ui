## aui-perf nightly record

_67 points · 2026-09-03T05:27:14.273Z to 2026-11-08T04:27:58.579Z · latest runner: Intel(R) Xeon(R) Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 371.34µs | -10.3% | -40.8% ⚠︎ | 367.63µs | 693.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 544.04µs | -1.7% | -24.4% ⚠︎ | 519.71µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 24.95µs | -1.3% | -29.0% ⚠︎ | 23.60µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 295.22µs | -4.2% | -24.9% ⚠︎ | 283.89µs | 443.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.666ms | -1.9% | -23.2% ⚠︎ | 4.419ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 124.47µs | -2.5% | -20.4% ⚠︎ | 118.58µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.143ms | -4.3% | -24.6% ⚠︎ | 1.102ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.676ms | -1.9% | -19.8% ⚠︎ | 4.374ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.43µs | -7.3% | -35.1% ⚠︎ | 4.36µs | 7.80µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 38.18µs | -6.5% | -31.6% ⚠︎ | 36.02µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 143.17µs | -10.9% | -34.8% ⚠︎ | 141.91µs | 245.47µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 37.84µs |  |  | 37.05µs | 37.89µs | 3 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 18.27µs |  |  | 17.92µs | 18.64µs | 3 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 17.93µs |  |  | 17.25µs | 18.17µs | 3 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 128.86µs |  |  | 126.17µs | 139.63µs | 3 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 33.78µs | +2.6% | -4.3% | 30.81µs | 46.67µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 324.19µs | -0.5% | -6.6% | 302.25µs | 414.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.31µs | +5.3% | -4.6% | 3.83µs | 6.38µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.94µs | +0.8% | -5.8% | 32.88µs | 52.26µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 285.79µs | -6.9% | -45.9% ⚠︎ | 285.01µs | 621.95µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.566ms | -8.3% | -46.5% ⚠︎ | 2.538ms | 5.522ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 9.985ms | -9.9% | -47.7% ⚠︎ | 9.923ms | 22.539ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 141.46µs | -13.9% | -57.4% ⚠︎ | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.375ms | -14.5% | -55.4% ⚠︎ | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 5.418ms | -15.9% | -56.7% ⚠︎ | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 106.15µs | -8.4% |  | 102.57µs | 171.19µs | 17 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 892.55µs | +28.5% |  | 642.90µs | 1.106ms | 17 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 31.70µs | +7.3% | +11.9% ⚠︎ | 27.00µs | 36.13µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 313.71µs | +2.9% | +2.1% | 278.66µs | 376.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.622ms | -0.5% | -3.1% | 1.497ms | 2.096ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 37.84µs | +16.9% | +11.8% ⚠︎ | 29.73µs | 43.42µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 383.35µs | +16.9% | +11.3% ⚠︎ | 302.89µs | 432.37µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.020ms | +16.6% | +7.9% | 1.603ms | 2.378ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.03µs | +7.2% | -7.3% | 16.17µs | 26.01µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 189.07µs | +9.1% | -6.3% | 159.22µs | 251.92µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.027ms | +10.3% | -6.2% | 858.96µs | 1.424ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | -8.5% | +4.5% | 0.10µs | 0.15µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -9.9% | +5.0% | 0.19µs | 0.25µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.11µs | -9.2% | -6.2% | 1.09µs | 1.91µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.27µs | -13.4% | -18.6% ⚠︎ | 0.27µs | 0.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.50µs | +3.0% | -11.2% ⚠︎ | 1.36µs | 2.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 13.55µs | +4.7% | -8.9% | 12.05µs | 20.63µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 71.97µs | +13.4% | -4.7% | 60.37µs | 96.58µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 412.96µs | +14.0% | -11.9% ⚠︎ | 350.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.379ms | +8.9% |  | 1.133ms | 1.847ms | 28 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 79.93µs | -8.5% |  | 79.43µs | 119.72µs | 27 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.788ms | +8.4% |  | 1.434ms | 2.155ms | 28 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 229.51µs | -2.8% |  | 213.31µs | 260.16µs | 28 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 333.95µs | +6.6% |  | 294.65µs | 401.63µs | 28 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 4.059ms | +16.8% |  | 2.767ms | 4.523ms | 28 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 320.59µs | -17.8% |  | 319.30µs | 542.42µs | 27 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.317ms | +8.7% |  | 8.621ms | 12.361ms | 28 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.568ms | -3.2% |  | 1.466ms | 1.886ms | 28 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.128ms | +0.6% |  | 1.047ms | 1.324ms | 28 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.313ms | +1.1% | +29.0% ⚠︎ | 1.023ms | 1.575ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.482ms | +2.2% | +8.1% | 1.339ms | 1.701ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 9.716ms | -3.9% | +32.5% ⚠︎ | 7.343ms | 11.964ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 10.979ms | -2.2% | +26.6% ⚠︎ | 8.611ms | 13.597ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 535.92µs | +12.4% | +6.6% | 447.66µs | 1.199ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.170ms | +6.0% | +11.2% ⚠︎ | 1.019ms | 1.634ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.470ms | +1.0% | +2.8% | 4.065ms | 7.821ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.113ms | +0.2% | -2.6% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.104ms | +6.5% | +5.0% | 1.033ms | 1.518ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.867ms | +0.3% | +1.2% | 2.219ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 119.22µs | +0.3% | +0.4% | 112.80µs | 206.73µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.112ms | -0.2% | +6.4% | 1.051ms | 2.404ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 129.493ms | +4.6% | -8.0% | 115.601ms | 184.038ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.558ms | +0.3% | +5.5% | 5.134ms | 9.608ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.00µs | -5.7% | -1.8% | 0.99µs | 1.46µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.53µs | +12.8% | -7.2% | 4.84µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 24.78µs | +42.2% | +9.0% | 14.86µs | 38.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.27µs | -15.0% | +26.9% ⚠︎ | 2.56µs | 4.17µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.67µs | +11.4% | +32.5% ⚠︎ | 10.50µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 31.45µs | -17.1% | +23.3% ⚠︎ | 24.16µs | 45.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 146.55µs | +0.7% | -34.3% ⚠︎ | 139.03µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.050ms | +2.4% | +11.3% ⚠︎ | 1.916ms | 4.550ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.949ms | -2.7% | +8.1% | 13.202ms | 28.415ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 185.247ms | -14.3% | -4.1% | 181.587ms | 368.431ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 204.60µs | +4.7% | -8.2% | 183.67µs | 294.40µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 365.51µs | +8.8% | -3.6% | 314.68µs | 496.38µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.793ms | +16.5% | +19.7% ⚠︎ | 1.438ms | 3.150ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 202.76µs | +8.5% | -6.6% | 177.60µs | 302.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 632.18µs | +16.7% | -22.5% ⚠︎ | 525.40µs | 842.59µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.505ms | +16.5% | -53.8% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 195.72µs | +10.4% | +4.5% | 169.36µs | 319.95µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 472.36µs | +20.7% | -26.7% ⚠︎ | 369.46µs | 669.46µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.228ms | +20.1% | -58.3% ⚠︎ | 2.554ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 85.47µs | +3.1% | -14.7% ⚠︎ | 81.54µs | 140.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 199.13µs | +6.8% | +7.8% | 173.27µs | 285.83µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.511ms | +14.3% | +23.3% ⚠︎ | 1.198ms | 2.197ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.71µs | +3.0% | +1.2% | 6.32µs | 9.65µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 15.42µs | +1.0% | +5.0% | 14.21µs | 22.73µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 130.63µs | +13.5% | +24.0% ⚠︎ | 102.78µs | 187.99µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 199.89µs | +11.3% | +3.7% | 172.05µs | 305.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 439.87µs | +8.7% | -15.1% ⚠︎ | 360.32µs | 696.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.397ms | +14.7% | -47.9% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 117.64µs | +1.6% | -13.2% ⚠︎ | 110.76µs | 163.70µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.060ms | -0.3% | -16.5% ⚠︎ | 999.64µs | 1.467ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 538.87µs | +0.7% | -14.0% ⚠︎ | 503.83µs | 742.08µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 129.02µs | -7.7% | -44.1% ⚠︎ | 125.86µs | 269.07µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.161ms | -7.1% | -42.9% ⚠︎ | 1.144ms | 2.356ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 584.45µs | -8.0% | -41.8% ⚠︎ | 581.91µs | 1.190ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 175.06µs | +10.3% | +23.3% ⚠︎ | 135.97µs | 194.02µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.359ms | +5.7% | -3.3% | 10.932ms | 16.835ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 445.596ms | +45.4% | +35.0% ⚠︎ | 290.173ms | 638.209ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 95.75µs | -8.1% | -52.2% ⚠︎ | 93.28µs | 234.82µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 807.81µs | -9.3% | -52.6% ⚠︎ | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 415.46µs | -8.2% | -52.8% ⚠︎ | 391.90µs | 1.025ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.749ms | +6.8% | +16.5% ⚠︎ | 1.470ms | 2.200ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.749ms | +6.6% | +14.0% ⚠︎ | 1.491ms | 2.110ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.687ms | +5.5% | +18.3% ⚠︎ | 1.433ms | 2.075ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.449ms | -2.7% | +1.3% | 1.376ms | 1.840ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 961.16µs | +3.5% | +10.2% ⚠︎ | 826.58µs | 1.270ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.495ms | -1.5% | +7.6% | 1.309ms | 1.751ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.502ms | -0.4% | +8.0% | 1.307ms | 1.806ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 118.23µs | +0.8% | -6.4% | 110.17µs | 180.66µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.42µs | -4.0% | +4.6% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 800.07µs | -1.8% | +8.6% | 689.25µs | 935.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 855.65µs | +5.0% | +16.0% ⚠︎ | 712.81µs | 1.063ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 890.88µs | +6.9% | +18.4% ⚠︎ | 715.83µs | 1.027ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.24µs | -8.6% | -41.8% ⚠︎ | 20.86µs | 36.56µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.99µs | -6.7% | -96.3% ⚠︎ | 21.05µs | 680.57µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.45µs | +2.6% | +3.1% | 32.06µs | 46.93µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 664.86µs | -5.5% | +8.0% | 587.81µs | 851.81µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
