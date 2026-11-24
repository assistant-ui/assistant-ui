## aui-perf nightly record

_83 points · 2026-09-03T05:27:14.273Z to 2026-11-24T04:32:18.050Z · latest runner: Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 855.82µs | +94.0% | +73.6% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.259ms | +88.3% | +118.0% ⚠︎ | 516.00µs | 1.259ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 57.32µs | +88.6% | +115.7% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 664.93µs | +88.6% | +115.3% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 10.244ms | +85.7% | +112.4% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 282.19µs | +90.6% | +121.0% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.609ms | +87.2% | +118.2% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 10.423ms | +91.2% | +119.3% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 10.25µs | +93.7% | +99.6% ⚠︎ | 4.36µs | 10.25µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 83.34µs | +91.0% | +96.8% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 326.20µs | +89.6% | +94.7% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 107.55µs | +111.5% |  | 35.87µs | 142.03µs | 19 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 64.64µs | +155.6% |  | 17.71µs | 85.03µs | 19 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 64.08µs | +145.7% |  | 16.08µs | 86.10µs | 19 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 320.55µs | +111.8% |  | 123.04µs | 348.12µs | 19 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 73.54µs | +91.4% | +95.8% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 688.38µs | +69.4% | +100.0% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 10.25µs | +101.0% | +127.9% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 82.92µs | +89.5% | +115.2% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 755.46µs | +105.0% | +128.1% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.089ms | +86.9% | +110.7% ⚠︎ | 2.538ms | 6.149ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 24.116ms | +86.3% | +111.8% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 4.099ms |  |  | 2.086ms | 4.387ms | 6 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 101.615ms |  |  | 62.415ms | 110.796ms | 6 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 18.744ms |  |  | 12.031ms | 20.271ms | 6 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 360.70µs | +85.6% | +96.4% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.475ms | +83.2% | +103.7% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.934ms | +89.4% | +104.5% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 284.57µs | +112.3% | +144.0% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.320ms | +186.6% | +190.4% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 70.65µs | +113.9% | +137.6% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 718.31µs | +111.1% | +119.0% ⚠︎ | 278.66µs | 718.31µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.849ms | +109.2% | +121.0% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 76.80µs | +103.5% | +116.1% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 780.30µs | +103.7% | +116.0% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.274ms | +113.4% | +117.1% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 40.37µs | +102.5% | +87.3% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 397.73µs | +107.6% | +86.5% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.194ms | +113.1% | +88.3% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.29µs | +99.5% | +163.0% ⚠︎ | 0.10µs | 0.29µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.49µs | +103.3% | +139.7% ⚠︎ | 0.19µs | 0.49µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.51µs | +75.6% | +102.6% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.70µs | +97.8% | +88.3% ⚠︎ | 0.27µs | 0.70µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.51µs | +113.7% | +85.0% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 30.65µs | +111.0% | +76.7% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 146.09µs | +63.6% | +93.8% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 916.29µs | +106.5% | +93.0% ⚠︎ | 346.91µs | 916.29µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.726ms | +104.6% | +104.4% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 186.36µs | +92.0% | +78.7% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.682ms | +109.4% | +139.7% ⚠︎ | 1.434ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 492.94µs | +99.5% | +115.7% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 700.11µs | +100.2% | +117.6% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.393ms | +97.4% | +126.6% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 800.09µs | +81.8% | +64.7% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 24.099ms | +130.9% | +146.0% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.906ms | +124.7% | +144.8% ⚠︎ | 1.456ms | 3.906ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.774ms | +105.8% | +144.4% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.015ms | +107.6% | +181.2% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.266ms | +98.1% | +135.8% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 20.863ms | +92.6% | +165.4% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 22.436ms | +83.5% | +146.4% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.512ms | +102.8% | +162.3% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.038ms | +115.7% | +181.3% ⚠︎ | 1.023ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 9.969ms | +85.1% | +130.9% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.186ms | +4.7% | +4.7% | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.841ms | +56.7% | +71.5% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.243ms | +46.3% | +61.3% ⚠︎ | 2.264ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 339.09µs | +87.1% | +161.7% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.895ms | +89.8% | +136.9% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 315.896ms | +114.6% | +126.6% ⚠︎ | 115.601ms | 315.896ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 13.881ms | +82.7% | +128.8% ⚠︎ | 5.344ms | 13.881ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.35µs | +88.9% | +124.2% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.68µs | +84.2% | +86.0% ⚠︎ | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 47.46µs | +164.2% | +136.1% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.00µs | +32.3% | +121.3% ⚠︎ | 2.57µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 24.35µs | +80.1% | +114.1% ⚠︎ | 10.50µs | 24.35µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 57.63µs | +40.2% | +123.7% ⚠︎ | 24.38µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 347.79µs | +85.0% | +42.4% ⚠︎ | 138.29µs | 347.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 6.521ms | +83.2% | +183.6% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 41.774ms | +74.2% | +165.5% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 435.118ms | +37.6% | +85.3% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 642.58µs | +173.1% | +226.0% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 971.49µs | +147.7% | +195.1% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 4.786ms | +144.6% | +181.4% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 593.19µs | +133.2% | +198.9% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.533ms | +121.7% | +142.5% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 15.228ms | +118.4% | +167.3% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 593.59µs | +161.2% | +192.5% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.278ms | +156.4% | +192.8% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 10.978ms | +219.7% | +275.7% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 301.55µs | +153.1% | +216.0% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 561.36µs | +136.7% | +179.1% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.290ms | +92.3% | +130.8% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 19.82µs | +124.1% | +175.2% ⚠︎ | 6.31µs | 25.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 36.47µs | +98.2% | +101.0% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 288.07µs | +112.2% | +96.9% ⚠︎ | 101.89µs | 288.07µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 655.49µs | +141.6% | +270.9% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.271ms | +158.9% | +217.9% ⚠︎ | 366.31µs | 1.271ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 9.091ms | +139.1% | +186.7% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 274.93µs | +100.1% | +132.0% ⚠︎ | 108.91µs | 274.93µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.345ms | +89.1% | +115.4% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.189ms | +90.4% | +119.2% ⚠︎ | 503.83µs | 1.189ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 330.48µs | +95.8% | +127.2% ⚠︎ | 125.86µs | 330.48µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.744ms | +83.0% | +112.0% ⚠︎ | 1.144ms | 2.744ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.402ms | +83.1% | +113.1% ⚠︎ | 581.91µs | 1.402ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 344.46µs | +91.8% | +139.1% ⚠︎ | 136.11µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 26.008ms | +91.5% | +111.0% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 807.432ms | +110.9% | +139.3% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 241.51µs | +86.6% | +110.0% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.904ms | +73.6% | +94.5% ⚠︎ | 786.61µs | 1.911ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 981.25µs | +78.9% | +97.3% ⚠︎ | 391.90µs | 981.25µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 203.58µs | +106.8% |  | 98.43µs | 215.84µs | 15 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 929.79µs | +103.2% |  | 457.68µs | 1.006ms | 15 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 226.59µs | +109.0% |  | 108.43µs | 237.00µs | 15 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.000ms | +107.9% |  | 481.00µs | 1.038ms | 15 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.804ms | +97.7% | +135.9% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.883ms | +100.8% | +138.6% ⚠︎ | 1.513ms | 3.883ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.783ms | +108.1% | +148.9% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.758ms | +103.8% | +160.7% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.446ms | +113.7% | +177.8% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.488ms | +92.8% | +148.0% ⚠︎ | 1.309ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.473ms | +103.7% | +145.3% ⚠︎ | 1.307ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 308.72µs | +112.8% | +157.6% ⚠︎ | 110.17µs | 308.72µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 121.48µs | +55.6% | +87.2% ⚠︎ | 61.85µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.854ms | +101.2% | +152.0% ⚠︎ | 689.25µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 2.095ms | +124.6% | +177.7% ⚠︎ | 712.81µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.180ms | +121.4% | +184.6% ⚠︎ | 715.83µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 48.13µs | +77.8% | +118.3% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 50.67µs | +75.9% | +127.3% ⚠︎ | 21.22µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 75.53µs | +90.6% | +120.5% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.556ms | +104.1% | +145.9% ⚠︎ | 587.81µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
