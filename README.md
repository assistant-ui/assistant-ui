## aui-perf nightly record

_86 points · 2026-09-03T05:27:14.273Z to 2026-11-27T04:32:04.823Z · latest runner: AMD EPYC 9V74 80-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 705.22µs | +23.4% | +19.1% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.016ms | +21.3% | +42.9% ⚠︎ | 516.00µs | 1.259ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 44.34µs | +28.6% | +48.7% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 510.88µs | +39.2% | +46.6% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 8.007ms | +40.7% | +48.2% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 212.83µs | +39.8% | +50.1% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.960ms | +38.3% | +45.7% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 7.900ms | +40.9% | +41.7% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 8.30µs | +26.0% | +33.6% ⚠︎ | 4.36µs | 10.25µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 70.21µs | +26.8% | +40.2% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 274.92µs | +24.4% | +36.9% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 82.97µs | +44.1% |  | 35.87µs | 142.03µs | 22 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 44.92µs | +38.0% |  | 17.71µs | 85.03µs | 22 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 44.20µs | +38.3% |  | 16.08µs | 86.10µs | 22 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 246.64µs | +19.7% |  | 123.04µs | 348.12µs | 22 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 54.78µs | +18.7% | +28.6% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 533.40µs | +8.6% | +30.8% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 7.63µs | +22.1% | +50.1% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 62.37µs | +19.2% | +39.6% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 602.88µs | +32.0% | +67.0% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.109ms | +32.6% | +62.4% ⚠︎ | 2.538ms | 6.149ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 20.310ms | +36.3% | +58.4% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 3.009ms | +9.3% |  | 2.086ms | 4.387ms | 9 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 97.262ms | +46.3% |  | 62.415ms | 110.796ms | 9 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 15.643ms | +21.4% |  | 12.031ms | 20.271ms | 9 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 291.50µs | +39.8% | +49.7% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.842ms | +38.0% | +53.8% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 11.361ms | +40.8% | +52.7% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 217.86µs | -3.6% | +52.2% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.711ms | -12.4% | +87.5% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 50.25µs | +16.1% | +48.1% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 512.89µs | +17.5% | +38.0% ⚠︎ | 278.66µs | 718.31µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.700ms | +15.3% | +28.8% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 60.45µs | +11.2% | +52.7% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 610.73µs | +12.4% | +50.0% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 3.193ms | +7.6% | +40.2% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 31.78µs | +13.3% | +28.2% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 304.94µs | +12.9% | +25.0% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.629ms | +12.4% | +26.4% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.22µs | +23.9% | +83.7% ⚠︎ | 0.11µs | 0.29µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.38µs | +24.3% | +62.5% ⚠︎ | 0.20µs | 0.49µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.15µs | +35.9% | +51.8% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.50µs | +28.4% | +11.6% ⚠︎ | 0.27µs | 0.70µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.54µs | +10.3% | +15.5% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 22.96µs | +15.2% | +12.4% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 112.31µs | -2.3% | +25.8% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 592.17µs | -9.3% | +8.4% | 346.91µs | 916.29µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.126ms | +6.3% | +45.9% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 160.93µs | +35.3% | +34.4% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.757ms | +9.3% | +55.2% ⚠︎ | 1.498ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 390.87µs | +11.4% | +50.2% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 507.48µs | +0.8% | +35.1% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 6.116ms | +6.3% | +83.2% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 760.67µs | +62.5% | +40.9% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 16.668ms | +12.2% | +42.6% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.805ms | +18.5% | +49.5% ⚠︎ | 1.456ms | 3.906ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.952ms | +10.1% | +51.9% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 2.376ms | +19.2% | +86.6% ⚠︎ | 1.078ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.499ms | +12.7% | +68.2% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 17.485ms | +29.4% | +81.1% ⚠︎ | 7.908ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 18.598ms | +25.6% | +77.5% ⚠︎ | 9.049ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.040ms | -10.8% | -13.3% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 2.199ms | +13.0% | +34.6% ⚠︎ | 1.044ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 7.971ms | +18.9% | +1.9% | 4.115ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.276ms | -2.3% | +3.3% | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.462ms | +4.1% | +15.4% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.226ms | +6.4% | +58.6% ⚠︎ | 2.264ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 262.52µs | +28.9% | +76.0% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.197ms | +23.9% | +49.2% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 216.600ms | +18.0% | +39.9% ⚠︎ | 115.601ms | 315.896ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 10.785ms | +26.9% | +55.2% ⚠︎ | 5.344ms | 13.881ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.85µs | +49.1% | +26.6% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.48µs | +69.2% | -10.6% ⚠︎ | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 38.19µs | +43.5% | -0.6% | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 7.32µs | +55.6% | +159.1% ⚠︎ | 2.70µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 21.63µs | +36.1% | +76.6% ⚠︎ | 12.03µs | 24.35µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 72.46µs | +58.1% | +160.0% ⚠︎ | 25.82µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 258.17µs | +28.2% | -0.8% | 138.29µs | 347.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.777ms | +6.0% | +22.2% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 33.866ms | +38.5% | +48.5% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 398.319ms | +26.7% | +36.6% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 498.37µs | +37.1% | +93.5% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 716.50µs | +6.3% | +48.6% ⚠︎ | 315.10µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.529ms | +19.0% | +19.2% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 502.21µs | +28.8% | +65.9% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.210ms | +5.2% | +54.3% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 15.053ms | +68.2% | -0.9% | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 449.76µs | +42.4% | +83.3% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 905.54µs | +2.4% | +74.4% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 11.469ms | +114.7% | +35.1% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 261.28µs | +71.3% | +97.0% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 457.89µs | +24.0% | +60.2% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.772ms | +12.1% | +31.3% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 13.74µs | +23.5% | +56.8% ⚠︎ | 6.31µs | 25.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 28.11µs | +21.5% | +23.7% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 203.51µs | +3.6% | +8.3% | 101.89µs | 288.07µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 457.87µs | +14.8% | +95.1% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 802.75µs | -7.6% | +46.9% ⚠︎ | 366.31µs | 1.271ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.483ms | +49.0% | -2.4% | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 198.06µs | +24.0% | +26.6% ⚠︎ | 108.91µs | 274.93µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.775ms | +22.3% | +29.3% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 886.77µs | +20.8% | +23.6% ⚠︎ | 503.83µs | 1.189ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 244.89µs | +38.1% | +30.9% ⚠︎ | 125.86µs | 330.48µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.163ms | +37.5% | +29.5% ⚠︎ | 1.144ms | 2.744ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.086ms | +35.6% | +30.1% ⚠︎ | 581.91µs | 1.402ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 268.22µs | +10.4% | +50.7% ⚠︎ | 145.23µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 21.021ms | +25.1% | +25.3% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 478.659ms | -28.5% | +30.0% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 186.31µs | +41.0% | +22.2% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.570ms | +42.7% | +24.5% ⚠︎ | 786.61µs | 1.911ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 802.73µs | +43.3% | +17.4% ⚠︎ | 391.90µs | 981.25µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 162.49µs | +10.6% |  | 98.43µs | 215.84µs | 18 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 735.22µs | +4.1% |  | 457.68µs | 1.006ms | 18 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 176.38µs | +10.7% |  | 108.43µs | 237.00µs | 18 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 802.61µs | +9.9% |  | 481.00µs | 1.038ms | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.691ms | +15.8% | +24.5% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.729ms | +13.8% | +29.4% ⚠︎ | 1.513ms | 3.883ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.633ms | +14.7% | +26.9% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.706ms | +22.4% | +61.6% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.745ms | +11.5% | +50.6% ⚠︎ | 866.42µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.544ms | +12.6% | +46.1% ⚠︎ | 1.394ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.542ms | +13.2% | +40.7% ⚠︎ | 1.382ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 202.15µs | -11.9% | +26.7% ⚠︎ | 110.17µs | 308.72µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 108.44µs | +13.7% | +50.7% ⚠︎ | 63.40µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.343ms | +12.7% | +43.6% ⚠︎ | 736.21µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.421ms | +13.5% | +67.0% ⚠︎ | 747.65µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.477ms | +10.1% | +64.5% ⚠︎ | 758.81µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.89µs | +26.9% | +65.6% ⚠︎ | 21.24µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 40.86µs | +24.3% | +66.5% ⚠︎ | 21.99µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 54.55µs | +9.2% | +20.2% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.173ms | +21.8% | +68.1% ⚠︎ | 635.40µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
