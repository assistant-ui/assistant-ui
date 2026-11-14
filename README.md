## aui-perf nightly record

_73 points · 2026-09-03T05:27:14.273Z to 2026-11-14T04:29:33.433Z · latest runner: AMD EPYC 9V74 80-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 704.24µs | +88.7% | +1.5% | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.011ms | +92.0% | +25.0% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 45.63µs | +80.2% | +12.0% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 530.26µs | +76.6% | +19.6% ⚠︎ | 283.89µs | 654.72µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 8.183ms | +72.7% | +18.7% ⚠︎ | 4.419ms | 10.298ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 222.23µs | +74.2% | +16.7% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.126ms | +80.4% | +24.0% ⚠︎ | 1.102ms | 2.578ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 8.111ms | +72.4% | +17.9% ⚠︎ | 4.374ms | 10.154ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 8.33µs | +91.0% | +6.8% | 4.36µs | 9.92µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 70.37µs | +95.3% | +14.3% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 274.81µs | +93.6% | +11.9% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 82.64µs | +118.1% |  | 35.87µs | 142.03µs | 9 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 44.45µs | +138.4% |  | 17.71µs | 85.03µs | 9 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 42.47µs | +133.8% |  | 16.08µs | 86.10µs | 9 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 257.07µs | +84.1% |  | 123.04µs | 348.12µs | 9 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 53.41µs | +64.2% | +19.1% ⚠︎ | 30.81µs | 75.26µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 529.31µs | +67.9% | +27.8% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 7.68µs | +74.8% | +40.5% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 62.89µs | +77.7% | +38.1% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 590.08µs | +106.5% | -5.1% | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.080ms | +98.9% | -8.0% | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.944ms | +98.2% | -11.5% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 290.19µs | +102.3% | -24.5% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.832ms | +110.4% | -21.7% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 11.071ms | +107.9% | -26.2% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 216.13µs | +91.5% |  | 102.57µs | 292.71µs | 23 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.557ms | +78.9% |  | 642.90µs | 2.447ms | 23 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 50.48µs | +68.1% | +56.2% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 510.80µs | +68.5% | +40.2% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.711ms | +73.0% | +37.5% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 59.56µs | +64.2% | +53.5% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 604.60µs | +63.5% | +52.8% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 3.181ms | +63.5% | +46.0% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 31.04µs | +64.1% | +35.9% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 297.64µs | +62.6% | +31.5% ⚠︎ | 158.01µs | 421.89µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.583ms | +58.3% | +23.4% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.21µs | +79.1% | +77.2% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.37µs | +79.6% | +68.5% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.10µs | +92.2% | +52.8% ⚠︎ | 1.09µs | 2.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.49µs | +80.1% | +20.7% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.53µs | +70.9% | +25.3% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 23.36µs | +74.5% | +31.1% ⚠︎ | 12.04µs | 31.83µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 113.93µs | +55.9% | +27.2% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 584.85µs | +40.6% | -1.8% | 346.91µs | 877.47µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.135ms | +56.7% | +51.2% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 160.87µs | +102.2% | +35.7% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.654ms | +49.4% | +57.4% ⚠︎ | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 390.43µs | +67.2% | +58.6% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 506.24µs | +48.1% | +37.0% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 6.119ms | +49.7% | +86.5% ⚠︎ | 2.767ms | 7.995ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 760.82µs | +138.1% | +46.6% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 16.379ms | +58.6% | +45.4% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.761ms | +69.0% | +57.9% ⚠︎ | 1.456ms | 3.751ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.925ms | +70.1% | +47.7% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 2.347ms | +77.2% | +95.7% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.490ms | +65.7% | +69.7% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 17.016ms | +76.9% | +98.8% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 18.151ms | +62.9% | +81.9% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.018ms | +90.6% | +40.6% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 2.159ms | +84.2% | +72.7% ⚠︎ | 1.019ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 7.526ms | +67.8% | +48.7% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.356ms | +22.3% | +21.6% ⚠︎ | 1.104ms | 1.356ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.392ms | +24.2% | +23.6% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.246ms | +39.8% | +64.4% ⚠︎ | 2.219ms | 4.932ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 256.57µs | +112.5% | +69.0% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.186ms | +95.5% | +55.2% ⚠︎ | 1.053ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 213.084ms | +68.9% | +24.6% ⚠︎ | 115.601ms | 311.004ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 10.726ms | +91.2% | +57.9% ⚠︎ | 5.191ms | 13.358ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.85µs | +82.1% | +57.1% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.48µs | +74.3% | +67.2% ⚠︎ | 4.82µs | 10.68µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 37.37µs | +52.3% | +117.8% ⚠︎ | 14.86µs | 47.83µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.85µs | +122.0% | +124.4% ⚠︎ | 2.56µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 19.67µs | +42.1% | +67.9% ⚠︎ | 10.50µs | 22.49µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 63.93µs | +110.7% | +121.0% ⚠︎ | 24.16µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 251.40µs | +80.8% | -5.0% | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.720ms | +128.8% | +63.5% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 32.202ms | +130.7% | +83.1% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 395.020ms | +116.9% | +36.0% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 526.65µs | +156.2% | +106.9% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 764.84µs | +108.8% | +97.4% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.358ms | +100.3% | +52.3% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 557.03µs | +166.9% | +124.3% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.125ms | +74.2% | +56.7% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 12.573ms | +133.3% | +86.8% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 472.10µs | +138.8% | +84.6% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 878.40µs | +89.9% | +55.1% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 10.137ms | +219.1% | +159.9% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 271.14µs | +219.6% | +126.2% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 476.92µs | +132.8% | +82.3% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.894ms | +100.6% | +79.9% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 12.88µs | +85.6% | +53.7% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 26.58µs | +68.3% | +45.3% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 205.02µs | +55.6% | +66.3% ⚠︎ | 101.89µs | 279.92µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 452.67µs | +129.9% | +83.8% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 889.11µs | +94.1% | +75.5% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 6.960ms | +103.1% | +59.7% ⚠︎ | 2.647ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 201.32µs | +73.5% | +23.0% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.817ms | +71.4% | +23.8% ⚠︎ | 999.64µs | 2.284ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 913.01µs | +70.5% | +23.0% ⚠︎ | 503.83µs | 1.152ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 244.44µs | +94.2% | -9.2% | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.144ms | +85.3% | -9.0% | 1.144ms | 2.680ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.093ms | +87.4% | -8.2% | 581.91µs | 1.354ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 267.36µs | +57.2% | +60.9% ⚠︎ | 135.97µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 21.039ms | +73.3% | +57.2% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 477.893ms | +9.1% | +36.3% ⚠︎ | 290.173ms | 711.084ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 190.79µs | +104.5% | -18.8% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.568ms | +99.3% | -20.9% ⚠︎ | 786.61µs | 1.901ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 803.52µs | +105.0% | -21.6% ⚠︎ | 391.90µs | 965.55µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 163.28µs |  |  | 163.28µs | 215.84µs | 5 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 764.30µs |  |  | 764.30µs | 1.006ms | 5 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 180.38µs |  |  | 180.38µs | 237.00µs | 5 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 801.03µs |  |  | 801.03µs | 1.038ms | 5 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.695ms | +60.3% | +51.6% ⚠︎ | 1.470ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.723ms | +60.8% | +55.2% ⚠︎ | 1.512ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.664ms | +60.2% | +59.9% ⚠︎ | 1.445ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.653ms | +89.9% | +54.2% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.675ms | +67.6% | +65.1% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.529ms | +74.1% | +50.6% ⚠︎ | 1.309ms | 3.488ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.530ms | +71.9% | +57.6% ⚠︎ | 1.307ms | 3.380ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 208.48µs | +82.9% | +55.6% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 109.73µs | +71.2% | +47.1% ⚠︎ | 60.96µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.303ms | +72.2% | +51.4% ⚠︎ | 689.25µs | 1.737ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.426ms | +67.6% | +57.5% ⚠︎ | 712.81µs | 2.141ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.480ms | +65.5% | +56.3% ⚠︎ | 715.83µs | 2.220ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 37.63µs | +72.1% | +48.5% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 39.77µs | +80.6% | +53.2% ⚠︎ | 21.05µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 54.17µs | +56.1% | +44.2% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.150ms | +67.9% | +55.6% ⚠︎ | 587.81µs | 1.571ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
