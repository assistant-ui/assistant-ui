## aui-perf nightly record

_79 points · 2026-09-03T05:27:14.273Z to 2026-11-20T04:31:01.235Z · latest runner: Intel(R) Xeon(R) 6975P-C · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 571.71µs | -33.0% | +18.2% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 837.93µs | -30.5% | +46.7% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.47µs | -39.7% | +29.9% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 367.00µs | -42.9% | +18.6% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.691ms | -42.8% | +21.1% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 152.23µs | -45.6% | +20.4% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.417ms | -43.6% | +20.7% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.605ms | -42.9% | +19.1% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.59µs | -31.8% | +26.7% ⚠︎ | 4.36µs | 10.13µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 55.36µs | -35.6% | +29.2% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 221.00µs | -35.0% | +31.1% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 57.59µs | -58.6% |  | 35.87µs | 142.03µs | 15 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 32.56µs | -59.4% |  | 17.71µs | 85.03µs | 15 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 31.96µs | -60.4% |  | 16.08µs | 86.10µs | 15 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 206.02µs | -34.6% |  | 123.04µs | 348.12µs | 15 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 46.15µs | -38.3% | +24.0% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 491.34µs | -26.5% | +29.9% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.25µs | -36.7% | +33.4% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 52.34µs | -37.4% | +33.4% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 456.66µs | -39.6% | +41.0% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.854ms | -35.8% | +35.7% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 14.901ms | -38.0% | +32.9% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 2.753ms |  |  | 2.688ms | 2.753ms | 2 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 66.488ms |  |  | 62.415ms | 66.488ms | 2 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 12.885ms |  |  | 12.031ms | 12.885ms | 2 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 208.53µs | -40.9% | +8.1% | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.059ms | -37.7% | +14.8% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.069ms | -38.4% | +1.4% | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 225.88µs | -17.8% |  | 102.57µs | 292.71µs | 29 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.953ms | -0.2% |  | 642.90µs | 2.447ms | 29 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 43.30µs | -38.8% | +46.6% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 436.55µs | -38.3% | +35.2% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.343ms | -37.6% | +32.9% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 54.37µs | -31.7% | +63.7% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 543.26µs | -32.4% | +51.0% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.967ms | -29.6% | +57.2% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 28.05µs | -33.1% | +38.8% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 270.21µs | -35.1% | +38.0% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.450ms | -33.8% | +35.0% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.17µs | -38.2% | +56.0% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.30µs | -33.0% | +52.3% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.58µs | -34.2% | +32.6% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.39µs | -42.1% | +9.1% | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.31µs | -33.9% | +30.1% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.93µs | -36.8% | +26.1% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 114.93µs | -19.7% | +46.2% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 653.16µs | -20.7% | +38.3% ⚠︎ | 346.91µs | 903.49µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.001ms | -28.8% | +50.4% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 118.98µs | -42.5% | +11.1% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.522ms | -35.4% | +64.0% ⚠︎ | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 350.75µs | -31.3% | +51.5% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 503.41µs | -29.9% | +53.0% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 5.751ms | -20.1% | +72.5% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 468.11µs | -48.5% | -4.2% | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 14.859ms | -40.0% | +53.9% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.367ms | -34.7% | +49.3% ⚠︎ | 1.456ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.774ms | -36.7% | +56.5% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.993ms | -35.8% | +87.2% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.218ms | -33.3% | +54.5% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 13.510ms | -37.7% | +66.5% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 14.803ms | -36.2% | +59.1% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.166ms | -22.3% | +87.3% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.946ms | -37.9% | +82.0% ⚠︎ | 1.023ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 6.701ms | -34.0% | +47.7% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.306ms | +7.6% | +14.3% ⚠︎ | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.404ms | -28.6% | +29.9% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.972ms | -19.5% | +55.3% ⚠︎ | 2.219ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 203.67µs | -38.9% | +67.3% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.773ms | -33.5% | +53.4% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 183.556ms | -39.2% | +24.6% ⚠︎ | 115.601ms | 312.212ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 8.502ms | -32.7% | +46.1% ⚠︎ | 5.344ms | 13.429ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.24µs | -45.9% | +10.0% | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.60µs | -42.0% | -6.8% | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 26.61µs | -33.5% | +24.1% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.71µs | -26.9% | +73.3% ⚠︎ | 2.57µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 15.89µs | -25.7% | +28.7% ⚠︎ | 10.50µs | 23.76µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 45.84µs | -26.8% | +75.2% ⚠︎ | 24.38µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 201.36µs | -27.9% | -22.5% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.509ms | -35.8% | +77.6% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 24.454ms | -47.4% | +54.6% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 314.266ms | -34.7% | +23.1% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 363.48µs | -41.8% | +58.2% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 674.04µs | -35.2% | +77.9% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.966ms | -31.3% | +46.0% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 389.79µs | -42.3% | +75.5% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.150ms | -18.8% | +89.8% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 8.952ms | -42.1% | +37.6% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 315.77µs | -46.4% | +62.5% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 884.05µs | -19.2% | +106.1% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 5.343ms | -36.5% | +47.5% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 152.49µs | -54.8% | +39.0% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 369.39µs | -31.4% | +75.4% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.472ms | -19.0% | +78.3% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 11.12µs | -52.7% | +46.9% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 23.13µs | -42.1% | +21.9% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 196.53µs | -28.7% | +23.3% ⚠︎ | 101.89µs | 285.86µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 398.72µs | -43.5% | +85.6% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 868.80µs | -20.6% | +120.5% ⚠︎ | 366.31µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 5.695ms | -34.2% | +82.9% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 159.74µs | -40.9% | +38.2% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.451ms | -36.0% | +35.7% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 734.02µs | -36.0% | +39.2% ⚠︎ | 503.83µs | 1.188ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 177.37µs | -43.0% | +24.9% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.573ms | -39.1% | +27.2% ⚠︎ | 1.144ms | 2.704ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 801.44µs | -38.8% | +26.7% ⚠︎ | 581.91µs | 1.371ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 243.03µs | -30.2% | +70.5% ⚠︎ | 136.11µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 16.804ms | -36.3% | +32.7% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 669.530ms | +1.1% | +84.1% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 132.14µs | -44.7% | +16.8% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.100ms | -40.8% | +16.3% ⚠︎ | 786.61µs | 1.901ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 560.02µs | -40.8% | +11.8% ⚠︎ | 391.90µs | 980.16µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 146.96µs | -30.9% |  | 98.43µs | 215.84µs | 11 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 706.55µs | -28.2% |  | 457.68µs | 1.006ms | 11 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 159.35µs | -30.9% |  | 108.43µs | 237.00µs | 11 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 730.56µs | -28.4% |  | 481.00µs | 1.038ms | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.324ms | -35.1% | +49.9% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.398ms | -33.1% | +56.2% ⚠︎ | 1.513ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.295ms | -34.9% | +53.0% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.211ms | -40.4% | +47.8% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.566ms | -29.6% | +76.5% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.260ms | -32.1% | +60.6% ⚠︎ | 1.309ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.244ms | -32.2% | +57.6% ⚠︎ | 1.307ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 229.40µs | -4.5% | +91.2% ⚠︎ | 110.17µs | 301.50µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 95.38µs | -33.5% | +42.1% ⚠︎ | 61.85µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.192ms | -30.8% | +59.8% ⚠︎ | 689.25µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.252ms | -36.2% | +63.9% ⚠︎ | 712.81µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.342ms | -34.6% | +72.5% ⚠︎ | 715.83µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 30.66µs | -43.8% | +35.3% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 32.86µs | -39.8% | +45.9% ⚠︎ | 21.22µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 49.96µs | -30.4% | +43.6% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 962.84µs | -37.1% | +48.1% ⚠︎ | 587.81µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
