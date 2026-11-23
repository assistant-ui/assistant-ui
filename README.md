## aui-perf nightly record

_82 points · 2026-09-03T05:27:14.273Z to 2026-11-23T04:33:45.064Z · latest runner: AMD EPYC 7763 64-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 847.23µs | +0.1% | +55.0% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.253ms | +3.6% | +93.8% ⚠︎ | 516.00µs | 1.253ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 54.49µs | -3.2% | +71.8% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 619.46µs | -3.7% | +69.8% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 9.572ms | -4.9% | +70.4% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 269.95µs | -3.2% | +77.5% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.421ms | -3.8% | +76.2% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 9.457ms | -4.1% | +70.8% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 9.68µs | +0.5% | +69.8% ⚠︎ | 4.36µs | 10.13µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 86.26µs | +0.6% | +90.3% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 342.09µs | +0.5% | +89.5% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 138.43µs | -1.0% |  | 35.87µs | 142.03µs | 18 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 82.82µs | +1.0% |  | 17.71µs | 85.03µs | 18 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 83.42µs | +1.3% |  | 16.08µs | 86.10µs | 18 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 321.19µs | +2.4% |  | 123.04µs | 348.12µs | 18 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 71.63µs | +0.9% | +53.5% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 651.62µs | -0.6% | +61.8% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 9.90µs | +1.2% | +76.1% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 82.90µs | -0.1% | +70.6% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 779.49µs | +4.7% | +105.5% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.149ms | +2.6% | +86.4% ⚠︎ | 2.538ms | 6.149ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 24.310ms | +3.4% | +85.4% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 4.387ms |  |  | 2.086ms | 4.387ms | 5 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 110.796ms |  |  | 62.415ms | 110.796ms | 5 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 20.271ms |  |  | 12.031ms | 20.271ms | 5 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 351.81µs | +0.4% | +52.0% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.347ms | +2.8% | +53.9% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.350ms | +2.4% | +49.9% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 284.01µs | +5.2% | +120.3% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.376ms | +8.6% | +211.5% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 69.75µs | +1.5% | +117.0% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 699.88µs | -0.4% | +96.5% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.717ms | +0.2% | +92.3% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 80.71µs | +0.7% | +109.1% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 811.70µs | +1.3% | +104.2% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.290ms | +2.5% | +97.7% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 42.28µs | +1.4% | +81.0% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 420.69µs | -0.6% | +84.5% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.227ms | +0.5% | +82.7% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | -1.9% | +129.0% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.47µs | +2.7% | +110.6% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.44µs | +1.6% | +79.8% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.67µs | +1.8% | +62.9% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.48µs | +0.7% | +66.2% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 31.68µs | -0.7% | +66.0% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 144.01µs | -0.3% | +56.4% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 789.97µs | -1.6% | +32.9% ⚠︎ | 346.91µs | 903.49µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.835ms | +1.1% | +115.3% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 207.40µs | +0.2% | +77.6% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.904ms | +3.5% | +135.3% ⚠︎ | 1.434ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 513.94µs | +0.7% | +112.9% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 730.35µs | +2.2% | +100.0% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.438ms | -8.4% | +110.4% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 932.02µs | -0.2% | +71.8% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 24.388ms | -0.3% | +125.4% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.745ms | +3.1% | +117.4% ⚠︎ | 1.456ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.818ms | +0.7% | +117.4% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.129ms | +3.1% | +161.7% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.353ms | +2.7% | +126.1% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 22.210ms | +4.1% | +160.4% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 23.301ms | +3.8% | +136.1% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.491ms | -0.7% | +89.5% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.079ms | -2.1% | +154.4% ⚠︎ | 1.023ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 10.088ms | -0.3% | +104.1% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.168ms | -0.7% | +4.3% | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.850ms | -3.2% | +63.6% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.785ms | -3.4% | +115.6% ⚠︎ | 2.264ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 336.50µs | +1.0% | +108.8% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.750ms | +1.9% | +82.9% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 300.471ms | +1.1% | +78.3% ⚠︎ | 115.601ms | 312.212ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 12.841ms | +1.7% | +71.2% ⚠︎ | 5.344ms | 13.429ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.31µs | +3.7% | +96.4% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.27µs | -1.9% | +69.1% ⚠︎ | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 40.20µs | +4.5% | +124.5% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.42µs | +0.1% | +113.2% ⚠︎ | 2.57µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 20.46µs | +1.9% | +74.7% ⚠︎ | 10.50µs | 23.76µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 62.72µs | +0.1% | +119.2% ⚠︎ | 24.38µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 283.15µs | +4.4% | +5.8% | 138.29µs | 320.89µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 7.091ms | +2.9% | +137.2% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 47.566ms | +4.5% | +158.4% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 489.768ms | +4.7% | +69.3% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 634.76µs | +1.1% | +157.4% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 924.36µs | +3.9% | +133.2% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 5.257ms | +19.4% | +146.2% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 632.00µs | +0.8% | +172.6% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.468ms | -0.4% | +118.5% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 17.063ms | +18.9% | +147.8% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 588.90µs | +1.3% | +163.3% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.087ms | -4.3% | +114.7% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 9.306ms | +27.6% | +178.3% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 322.01µs | +0.3% | +190.8% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 533.66µs | -3.4% | +128.3% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.092ms | -9.5% | +101.5% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 25.23µs | +6.3% | +194.9% ⚠︎ | 6.31µs | 25.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 41.55µs | +6.9% | +98.7% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 267.55µs | -5.1% | +62.7% ⚠︎ | 101.89µs | 285.86µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 733.19µs | +1.6% | +235.9% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.140ms | +3.0% | +128.0% ⚠︎ | 366.31µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.628ms | -6.9% | +127.7% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 263.75µs | +1.4% | +94.5% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.247ms | +0.2% | +82.5% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.131ms | -0.6% | +83.2% ⚠︎ | 503.83µs | 1.188ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 324.47µs | +2.2% | +95.3% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.654ms | +2.8% | +81.6% ⚠︎ | 1.144ms | 2.704ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.347ms | +2.3% | +82.0% ⚠︎ | 581.91µs | 1.371ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 352.80µs | +0.1% | +118.4% ⚠︎ | 136.11µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 27.110ms | +1.6% | +105.7% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 677.210ms | +2.7% | +88.4% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 242.90µs | +1.6% | +80.0% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.911ms | +2.5% | +75.6% ⚠︎ | 786.61µs | 1.911ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 972.36µs | +2.2% | +72.5% ⚠︎ | 391.90µs | 980.16µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 211.62µs | +0.8% |  | 98.43µs | 215.84µs | 14 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 971.92µs | -0.5% |  | 457.68µs | 1.006ms | 14 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 231.84µs | -0.1% |  | 108.43µs | 237.00µs | 14 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.022ms | +0.5% |  | 481.00µs | 1.038ms | 14 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.595ms | -0.8% | +98.7% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.517ms | -2.8% | +95.9% ⚠︎ | 1.513ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.490ms | -1.6% | +100.5% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.737ms | -1.1% | +121.5% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.213ms | +0.4% | +111.9% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.327ms | -2.6% | +104.3% ⚠︎ | 1.309ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.350ms | -0.4% | +118.6% ⚠︎ | 1.307ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 259.06µs | +7.2% | +93.8% ⚠︎ | 110.17µs | 301.50µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 150.58µs | +3.1% | +104.4% ⚠︎ | 61.85µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.732ms | -1.8% | +102.5% ⚠︎ | 689.25µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.990ms | -2.7% | +131.9% ⚠︎ | 712.81µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.125ms | -1.5% | +136.8% ⚠︎ | 715.83µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 53.16µs | -1.1% | +114.2% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 54.70µs | +0.9% | +108.0% ⚠︎ | 21.22µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 71.75µs | +4.8% | +92.5% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.532ms | -0.5% | +114.9% ⚠︎ | 587.81µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
