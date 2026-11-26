## aui-perf nightly record

_85 points · 2026-09-03T05:27:14.273Z to 2026-11-26T04:31:46.646Z · latest runner: Intel(R) Xeon(R) 6973P-C · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 580.72µs | +6.8% | +15.9% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 893.03µs | +13.9% | +53.0% ⚠︎ | 516.00µs | 1.259ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 36.50µs | +13.0% | +31.4% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 373.52µs | +3.9% | +14.9% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.969ms | +7.6% | +18.7% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 159.30µs | +3.9% | +17.6% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.443ms | +4.1% | +16.0% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.934ms | +5.4% | +19.2% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.66µs | +5.2% | +25.2% ⚠︎ | 4.36µs | 10.25µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.97µs | +4.7% | +32.2% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 222.04µs | +6.5% | +36.6% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 60.63µs | +9.6% |  | 35.87µs | 142.03µs | 21 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 31.19µs | +2.3% |  | 17.71µs | 85.03µs | 21 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 32.67µs | +2.6% |  | 16.08µs | 86.10µs | 21 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 234.37µs | +17.9% |  | 123.04µs | 348.12µs | 21 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 46.23µs | +0.9% | +14.8% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 472.90µs | -1.7% | +27.7% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.53µs | +2.5% | +25.0% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 56.84µs | +4.3% | +29.4% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 468.08µs | +5.8% | +35.8% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.888ms | +4.5% | +27.5% ⚠︎ | 2.538ms | 6.149ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 15.201ms | +4.5% | +25.6% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 3.038ms | +13.0% |  | 2.086ms | 4.387ms | 8 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 75.856ms | +21.5% |  | 62.415ms | 110.796ms | 8 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 14.883ms | +23.7% |  | 12.031ms | 20.271ms | 8 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 211.87µs | +3.6% | +14.0% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.172ms | +7.4% | +24.8% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.712ms | +7.9% | +27.6% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 234.03µs | +15.4% | +93.2% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.963ms | +10.0% | +123.8% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 41.94µs | -0.6% | +42.4% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 424.26µs | +1.1% | +27.3% ⚠︎ | 278.66µs | 718.31µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.318ms | +0.8% | +29.9% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 52.56µs | -1.8% | +48.0% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 534.24µs | +0.3% | +46.6% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.874ms | +0.5% | +45.9% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 27.74µs | +0.8% | +31.4% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 273.12µs | +6.2% | +35.0% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.447ms | +2.8% | +27.4% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.17µs | -4.0% | +51.5% ⚠︎ | 0.11µs | 0.29µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.28µs | -7.5% | +37.1% ⚠︎ | 0.20µs | 0.49µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.74µs | +10.8% | +37.2% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | -4.9% | -5.0% | 0.27µs | 0.70µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.18µs | -4.6% | +13.4% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 20.01µs | -0.4% | +18.2% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 113.83µs | -0.8% | +40.1% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 623.87µs | -3.2% | +29.7% ⚠︎ | 346.91µs | 916.29µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.870ms | -4.4% | +56.5% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 111.78µs | -5.6% | +5.7% | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.422ms | -4.8% | +60.1% ⚠︎ | 1.498ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 338.76µs | -0.2% | +51.8% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 498.30µs | -1.8% | +52.6% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 5.435ms | -6.1% | +70.5% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 455.54µs | -5.7% | -8.8% | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 14.856ms | +1.2% | +46.7% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.416ms | +3.0% | +53.1% ⚠︎ | 1.456ms | 3.906ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.780ms | -0.7% | +51.6% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.900ms | -4.4% | +73.6% ⚠︎ | 1.078ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.114ms | -3.7% | +49.0% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 12.792ms | -5.1% | +62.9% ⚠︎ | 7.908ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 13.978ms | -4.1% | +51.8% ⚠︎ | 9.049ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.150ms | +1.3% | +80.9% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.958ms | +4.6% | +75.3% ⚠︎ | 1.044ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 6.757ms | +3.7% | +48.6% ⚠︎ | 4.115ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.332ms | -11.7% | +18.0% ⚠︎ | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.453ms | +2.2% | +35.4% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.862ms | +0.1% | +66.2% ⚠︎ | 2.264ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 221.94µs | +8.5% | +50.2% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.895ms | +7.4% | +34.7% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 184.704ms | -0.3% | +25.7% ⚠︎ | 115.601ms | 315.896ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 9.341ms | +8.8% | +31.0% ⚠︎ | 5.344ms | 13.881ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.58µs | +28.9% | +41.8% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.19µs | +11.5% | +18.0% ⚠︎ | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 28.39µs | +10.0% | +80.7% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.51µs | -4.5% | +59.7% ⚠︎ | 2.70µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 18.70µs | +19.6% | +70.2% ⚠︎ | 12.03µs | 24.35µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 43.48µs | -5.2% | +63.6% ⚠︎ | 25.82µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 209.47µs | +6.3% | -15.2% ⚠︎ | 138.29µs | 347.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.690ms | +6.6% | +81.6% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 28.631ms | +5.6% | +59.7% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 350.766ms | +16.7% | +44.0% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 412.52µs | +3.6% | +94.7% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 732.59µs | +2.3% | +92.3% ⚠︎ | 315.10µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.144ms | +7.1% | +57.0% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 396.06µs | -3.9% | +86.5% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.133ms | -3.0% | +86.4% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 8.673ms | +2.3% | +36.6% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 394.51µs | +12.7% | +104.2% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 895.94µs | +1.8% | +124.0% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 6.188ms | +14.6% | +98.0% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 160.12µs | -2.5% | +60.9% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 380.04µs | -5.4% | +79.7% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.988ms | +15.1% | +109.3% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 11.19µs | +4.1% | +41.5% ⚠︎ | 6.31µs | 25.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 23.54µs | +2.1% | +23.4% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 202.72µs | -0.6% | +28.7% ⚠︎ | 101.89µs | 288.07µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 426.40µs | +13.4% | +86.6% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 904.17µs | +1.9% | +120.4% ⚠︎ | 366.31µs | 1.271ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.178ms | +9.6% | +106.0% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 161.24µs | +4.7% | +29.1% ⚠︎ | 108.91µs | 274.93µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.494ms | +6.9% | +29.9% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 741.13µs | +4.5% | +29.4% ⚠︎ | 503.83µs | 1.189ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 185.99µs | +7.3% | +23.7% ⚠︎ | 125.86µs | 330.48µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.693ms | +9.6% | +26.5% ⚠︎ | 1.144ms | 2.744ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 858.66µs | +10.2% | +27.1% ⚠︎ | 581.91µs | 1.402ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 237.14µs | -3.0% | +60.6% ⚠︎ | 145.23µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 18.015ms | +10.3% | +48.2% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 670.494ms | +3.9% | +105.2% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 134.50µs | +3.9% | +12.6% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.152ms | +8.7% | +14.6% ⚠︎ | 786.61µs | 1.911ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 589.89µs | +9.7% | +10.9% ⚠︎ | 391.90µs | 981.25µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 159.62µs | +11.2% |  | 98.43µs | 215.84µs | 17 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 736.43µs | +9.4% |  | 457.68µs | 1.006ms | 17 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 168.26µs | +9.0% |  | 108.43µs | 237.00µs | 17 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 801.99µs | +11.4% |  | 481.00µs | 1.038ms | 17 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.317ms | +4.7% | +47.3% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.370ms | +3.9% | +53.6% ⚠︎ | 1.513ms | 3.883ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.226ms | +1.2% | +46.6% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.126ms | -1.5% | +40.3% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.568ms | +9.9% | +69.4% ⚠︎ | 866.42µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.327ms | +7.3% | +60.9% ⚠︎ | 1.394ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.250ms | +4.2% | +58.8% ⚠︎ | 1.382ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 253.84µs | +14.6% | +101.0% ⚠︎ | 110.17µs | 308.72µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 84.05µs | -11.5% | +25.5% ⚠︎ | 63.40µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.205ms | +9.6% | +62.6% ⚠︎ | 736.21µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.349ms | +8.2% | +67.9% ⚠︎ | 747.65µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.378ms | +3.2% | +70.8% ⚠︎ | 758.81µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 32.28µs | +5.8% | +38.9% ⚠︎ | 21.24µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 35.34µs | +6.9% | +51.2% ⚠︎ | 21.99µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 58.05µs | +20.4% | +69.4% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.025ms | -2.7% | +58.8% ⚠︎ | 635.40µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
