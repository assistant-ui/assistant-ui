## aui-perf nightly record

_80 points · 2026-09-03T05:27:14.273Z to 2026-11-21T04:29:27.496Z · latest runner: AMD EPYC 9V45 96-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 475.64µs | -44.3% | -5.8% | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 722.39µs | -40.1% | +20.1% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 35.27µs | -38.3% | +21.5% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 369.68µs | -42.5% | +9.7% | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.818ms | -41.5% | +14.4% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 153.68µs | -45.1% | +11.4% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.435ms | -42.9% | +18.3% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.561ms | -43.4% | +8.7% | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.72µs | -40.8% | +13.7% ⚠︎ | 4.36µs | 10.13µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 47.38µs | -44.9% | +12.4% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 183.99µs | -45.9% | +14.3% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 49.12µs | -64.7% |  | 35.87µs | 142.03µs | 16 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 26.62µs | -66.8% |  | 17.71µs | 85.03µs | 16 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 28.86µs | -64.2% |  | 16.08µs | 86.10µs | 16 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 159.28µs | -49.4% |  | 123.04µs | 348.12µs | 16 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 40.44µs | -45.9% | +5.1% | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 417.75µs | -37.5% | +19.2% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.47µs | -44.6% | +0.3% | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 47.73µs | -42.9% | +14.4% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 381.24µs | -49.6% | +14.9% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.354ms | -44.2% | +22.2% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 13.808ms | -42.6% | +26.8% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 2.086ms |  |  | 2.086ms | 2.753ms | 3 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 72.449ms |  |  | 62.415ms | 72.449ms | 3 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 12.829ms |  |  | 12.031ms | 12.885ms | 3 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 194.95µs | -44.8% | +16.6% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.902ms | -42.4% | +15.0% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.579ms | -42.2% | +21.3% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 147.20µs | -46.4% |  | 102.57µs | 292.71µs | 30 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 886.28µs | -54.7% |  | 642.90µs | 2.447ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 36.10µs | -48.9% | +13.7% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 367.71µs | -48.1% | +13.3% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.006ms | -46.6% | +13.0% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 41.04µs | -48.5% | +5.5% | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 417.58µs | -48.1% | +6.8% | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.179ms | -48.3% | +0.4% | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.56µs | -48.5% | -8.3% | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 205.68µs | -50.6% | -9.6% | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.107ms | -49.4% | -15.1% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.15µs | -45.1% | +37.5% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.27µs | -40.5% | +31.5% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.57µs | -34.7% | +34.3% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.38µs | -42.7% | +13.8% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.72µs | -50.7% | -19.7% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.33µs | -51.4% | -23.3% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 95.19µs | -33.5% | +15.3% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 478.97µs | -41.9% | -14.1% ⚠︎ | 346.91µs | 903.49µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.419ms | -49.5% | -20.0% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 102.90µs | -50.3% | +0.4% | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.880ms | -51.8% | -7.1% | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 261.47µs | -48.8% | +8.4% | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 380.37µs | -47.0% | +1.8% | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.980ms | -44.7% | -12.0% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 464.57µs | -48.9% | +8.5% | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.166ms | -54.9% | -9.7% | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.876ms | -48.3% | +11.0% ⚠︎ | 1.456ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.463ms | -47.8% | +21.0% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.574ms | -49.3% | +37.0% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.652ms | -50.3% | +6.7% | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 11.367ms | -47.6% | +43.6% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 12.535ms | -46.0% | +34.7% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 839.83µs | -44.0% | +22.4% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.543ms | -50.8% | +31.2% ⚠︎ | 1.023ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.866ms | -42.2% | +30.3% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.177ms | -3.1% | +4.0% | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.176ms | -40.2% | +4.3% | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.839ms | -42.4% | +15.4% ⚠︎ | 2.219ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 199.21µs | -40.2% | +72.8% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.716ms | -35.6% | +59.6% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 160.443ms | -46.9% | +5.4% | 115.601ms | 312.212ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 8.662ms | -31.5% | +58.2% ⚠︎ | 5.344ms | 13.429ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.26µs | -45.0% | +11.7% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.22µs | -35.5% | -3.0% | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 20.03µs | -49.9% | -31.9% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.80µs | -25.5% | +39.3% ⚠︎ | 2.57µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 14.73µs | -31.1% | +7.2% | 10.50µs | 23.76µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 47.11µs | -24.8% | +46.3% ⚠︎ | 24.38µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 201.76µs | -27.7% | -37.4% ⚠︎ | 138.29µs | 320.89µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.369ms | -37.7% | +54.3% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 30.867ms | -33.5% | +82.8% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 367.713ms | -23.5% | +65.0% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 253.87µs | -59.4% | -1.8% | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 443.98µs | -57.3% | +3.9% | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.667ms | -38.3% | +24.8% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 269.87µs | -60.0% | +5.4% | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 813.41µs | -42.6% | +4.1% | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 13.460ms | -12.9% | +86.3% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 250.72µs | -57.5% | -2.0% | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 548.71µs | -49.8% | -10.4% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 7.380ms | -12.3% | +51.3% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 123.77µs | -63.3% | +0.4% | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 258.81µs | -51.9% | +5.4% | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.711ms | -43.9% | -9.5% | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 9.94µs | -57.8% | +14.5% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 20.39µs | -49.0% | +0.0% | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 142.67µs | -48.2% | -15.0% ⚠︎ | 101.89µs | 285.86µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 321.52µs | -54.4% | +37.2% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 527.94µs | -51.7% | -9.9% | 366.31µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 9.477ms | +9.5% | +98.0% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 146.16µs | -45.9% | +3.0% | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.323ms | -41.6% | +4.7% | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 664.84µs | -42.1% | +3.2% | 503.83µs | 1.188ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 180.59µs | -42.0% | +15.4% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.585ms | -38.6% | +15.4% ⚠︎ | 1.144ms | 2.704ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 795.61µs | -39.2% | +13.7% ⚠︎ | 581.91µs | 1.371ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 189.75µs | -45.5% | +0.5% | 136.11µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 15.367ms | -41.7% | +9.8% | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 397.779ms | -39.9% | -18.6% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 135.20µs | -43.4% | +27.7% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.136ms | -38.9% | +18.8% ⚠︎ | 786.61µs | 1.901ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 565.80µs | -40.2% | +21.8% ⚠︎ | 391.90µs | 980.16µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 104.43µs | -50.9% |  | 98.43µs | 215.84µs | 12 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 468.17µs | -52.4% |  | 457.68µs | 1.006ms | 12 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 117.59µs | -49.0% |  | 108.43µs | 237.00µs | 12 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 524.20µs | -48.6% |  | 481.00µs | 1.038ms | 12 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.974ms | -44.9% | +21.7% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.015ms | -43.8% | +19.6% ⚠︎ | 1.513ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.952ms | -44.6% | +26.4% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.984ms | -46.5% | +32.1% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.224ms | -44.9% | +20.0% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.811ms | -45.6% | +22.1% ⚠︎ | 1.309ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.758ms | -46.9% | +15.2% ⚠︎ | 1.307ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 154.55µs | -35.7% | +30.0% ⚠︎ | 110.17µs | 301.50µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 83.62µs | -41.7% | +30.5% ⚠︎ | 61.85µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 951.94µs | -44.7% | +25.0% ⚠︎ | 689.25µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 981.57µs | -50.0% | +15.9% ⚠︎ | 712.81µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.064ms | -48.1% | +21.3% ⚠︎ | 715.83µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 29.15µs | -46.5% | +32.9% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 30.98µs | -43.2% | +38.6% ⚠︎ | 21.22µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 40.31µs | -43.9% | +16.8% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 798.46µs | -47.8% | +17.5% ⚠︎ | 587.81µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
