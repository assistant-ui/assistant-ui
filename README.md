## aui-perf nightly record

_84 points · 2026-09-03T05:27:14.273Z to 2026-11-25T04:31:58.005Z · latest runner: Intel(R) Xeon(R) 6975P-C · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 585.66µs | +4.5% | +25.9% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 849.99µs | +6.7% | +57.4% ⚠︎ | 516.00µs | 1.259ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 37.42µs | +3.1% | +50.4% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 369.44µs | +0.1% | +26.4% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.766ms | -0.0% | +26.4% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 155.85µs | -1.2% | +29.0% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.411ms | -2.8% | +25.3% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.752ms | -2.3% | +27.8% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.76µs | +5.4% | +40.6% ⚠︎ | 4.36µs | 10.25µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 57.03µs | +5.2% | +43.2% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 226.28µs | +6.1% | +44.4% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 66.84µs | +22.7% |  | 35.87µs | 142.03µs | 20 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 32.97µs | +9.7% |  | 17.71µs | 85.03µs | 20 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 32.60µs | +4.1% |  | 16.08µs | 86.10µs | 20 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 209.74µs | +9.6% |  | 123.04µs | 348.12µs | 20 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 45.66µs | +0.1% | +36.5% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 473.25µs | -4.4% | +48.5% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.47µs | +6.4% | +53.0% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 53.99µs | +2.7% | +50.5% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 444.65µs | +2.3% | +43.6% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.718ms | +1.6% | +36.7% ⚠︎ | 2.538ms | 6.149ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 14.694ms | +3.6% | +36.2% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 2.704ms |  |  | 2.086ms | 4.387ms | 7 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 64.420ms |  |  | 62.415ms | 110.796ms | 7 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 13.984ms |  |  | 12.031ms | 20.271ms | 7 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 207.36µs | +0.6% | +17.5% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.047ms | +2.0% | +27.3% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.189ms | +1.4% | +26.9% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 216.94µs | +3.9% | +104.4% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.881ms | +0.5% | +147.8% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 44.06µs | +4.3% | +60.6% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 444.56µs | +4.4% | +46.3% ⚠︎ | 278.66µs | 718.31µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.405ms | +4.6% | +46.9% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 53.90µs | +0.5% | +66.5% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 552.97µs | +4.5% | +66.7% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 3.010ms | +5.5% | +66.6% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 28.66µs | +1.7% | +48.5% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 275.17µs | +2.4% | +47.9% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.473ms | +4.1% | +43.2% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.18µs | +3.8% | +74.0% ⚠︎ | 0.11µs | 0.29µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.31µs | +0.5% | +59.3% ⚠︎ | 0.20µs | 0.49µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.59µs | +1.2% | +35.5% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.38µs | +2.1% | +10.5% ⚠︎ | 0.27µs | 0.70µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.38µs | +5.0% | +32.1% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 20.59µs | +3.1% | +28.1% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 116.55µs | +3.2% | +64.4% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 654.69µs | +8.3% | +40.6% ⚠︎ | 346.91µs | 916.29µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.965ms | -0.2% | +58.3% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 118.31µs | -0.7% | +22.5% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.562ms | +0.1% | +78.7% ⚠︎ | 1.498ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 347.91µs | +1.9% | +62.2% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 516.49µs | +5.2% | +67.0% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 5.807ms | +0.7% | +90.9% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 480.81µs | -0.4% | +5.5% | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 15.183ms | +6.6% | +62.2% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.425ms | +4.3% | +60.9% ⚠︎ | 1.456ms | 3.906ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.766ms | -0.6% | +63.2% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.974ms | -0.8% | +92.9% ⚠︎ | 1.078ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.213ms | +0.6% | +58.6% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 13.512ms | +0.8% | +84.0% ⚠︎ | 7.854ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 14.763ms | +0.1% | +71.4% ⚠︎ | 9.049ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.114ms | -2.9% | +115.5% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.942ms | +2.0% | +89.9% ⚠︎ | 1.044ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 6.591ms | +4.1% | +62.1% ⚠︎ | 4.115ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.421ms | +3.5% | +27.5% ⚠︎ | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.444ms | +3.3% | +36.0% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.823ms | -0.8% | +30.3% ⚠︎ | 2.264ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 202.70µs | +8.9% | +66.3% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.682ms | +6.6% | +49.5% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 185.946ms | +1.2% | +44.5% ⚠︎ | 115.601ms | 315.896ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 8.307ms | +8.1% | +47.8% ⚠︎ | 5.344ms | 13.881ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.36µs | +14.8% | +35.6% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.54µs | -0.2% | -0.6% | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 26.89µs | +3.1% | +33.8% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.70µs | -0.4% | +83.0% ⚠︎ | 2.70µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 16.41µs | +5.8% | +56.2% ⚠︎ | 10.99µs | 24.35µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 45.80µs | -0.2% | +87.8% ⚠︎ | 25.82µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 199.08µs | +1.5% | -11.8% ⚠︎ | 138.29µs | 347.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.555ms | +3.4% | +111.2% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 27.529ms | +2.7% | +90.4% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 357.037ms | +8.7% | +63.4% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 358.52µs | -3.4% | +87.1% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 651.45µs | -4.9% | +107.0% ⚠︎ | 315.10µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.186ms | +3.6% | +104.1% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 367.71µs | -5.5% | +92.1% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.179ms | +4.7% | +119.2% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 9.018ms | +2.3% | +95.8% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 371.54µs | +5.8% | +99.4% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 908.49µs | +3.1% | +134.8% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 5.786ms | +0.4% | +109.5% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 147.08µs | -5.8% | +68.3% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 373.01µs | +2.3% | +95.0% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.370ms | +1.9% | +82.7% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 11.47µs | +3.7% | +71.4% ⚠︎ | 6.31µs | 25.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 23.34µs | +5.0% | +36.3% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 210.90µs | +4.2% | +51.2% ⚠︎ | 101.89µs | 288.07µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 432.21µs | +9.1% | +126.6% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 931.84µs | +10.6% | +135.3% ⚠︎ | 366.31µs | 1.271ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 5.845ms | +0.2% | +93.6% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 159.61µs | -1.0% | +41.9% ⚠︎ | 108.91µs | 274.93µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.455ms | -0.5% | +42.8% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 734.65µs | +0.9% | +43.3% ⚠︎ | 503.83µs | 1.189ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 182.23µs | +2.3% | +34.7% ⚠︎ | 125.86µs | 330.48µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.578ms | +0.5% | +30.9% ⚠︎ | 1.144ms | 2.744ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 811.83µs | +2.4% | +32.4% ⚠︎ | 581.91µs | 1.402ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 248.36µs | +1.3% | +82.5% ⚠︎ | 145.23µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 17.475ms | +3.4% | +46.3% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 673.772ms | +2.2% | +115.7% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 131.73µs | -1.1% | +22.4% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.097ms | -0.0% | +18.1% ⚠︎ | 786.61µs | 1.911ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 551.30µs | -0.8% | +16.7% ⚠︎ | 391.90µs | 981.25µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 157.69µs | +5.1% |  | 98.43µs | 215.84µs | 16 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 726.37µs | +0.1% |  | 457.68µs | 1.006ms | 16 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 172.44µs | +8.9% |  | 108.43µs | 237.00µs | 16 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 780.41µs | +6.3% |  | 481.00µs | 1.038ms | 16 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.254ms | +0.4% | +15.1% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.361ms | +1.3% | +26.2% ⚠︎ | 1.513ms | 3.883ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.296ms | +2.9% | +26.1% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.160ms | -1.0% | +55.6% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.509ms | +4.2% | +82.6% ⚠︎ | 866.42µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.128ms | -1.6% | +62.6% ⚠︎ | 1.394ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.141ms | -0.9% | +63.8% ⚠︎ | 1.382ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 219.93µs | +1.3% | +99.2% ⚠︎ | 110.17µs | 308.72µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 95.29µs | +0.1% | +54.1% ⚠︎ | 63.40µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.107ms | -1.1% | +60.6% ⚠︎ | 736.21µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.318ms | +8.0% | +84.9% ⚠︎ | 747.65µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.357ms | +2.9% | +89.6% ⚠︎ | 758.81µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 30.71µs | +3.9% | +47.2% ⚠︎ | 21.24µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 33.85µs | +5.9% | +59.5% ⚠︎ | 21.99µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 57.63µs | +29.9% | +76.7% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 966.24µs | -0.1% | +64.4% ⚠︎ | 635.40µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
