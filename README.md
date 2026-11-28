## aui-perf nightly record

_87 points · 2026-09-03T05:27:14.273Z to 2026-11-28T04:31:09.004Z · latest runner: AMD EPYC 9V74 80-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 885.55µs | +86.2% | +56.5% ⚠︎ | 367.63µs | 885.55µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.290ms | +78.6% | +101.2% ⚠︎ | 516.00µs | 1.290ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 54.14µs | +53.5% | +93.3% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 636.73µs | +72.2% | +96.3% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 9.930ms | +70.7% | +96.8% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 273.04µs | +77.7% | +98.8% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.503ms | +74.4% | +99.0% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 9.860ms | +77.3% | +88.7% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 10.48µs | +83.3% | +70.2% ⚠︎ | 4.36µs | 10.48µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 88.01µs | +85.7% | +90.7% ⚠︎ | 36.02µs | 88.01µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 344.63µs | +87.3% | +79.2% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 104.31µs | +112.3% |  | 35.87µs | 142.03µs | 23 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 61.63µs | +131.5% |  | 17.71µs | 85.03µs | 23 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 59.38µs | +105.7% |  | 16.08µs | 86.10µs | 23 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 306.02µs | +92.1% |  | 123.04µs | 348.12µs | 23 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 71.04µs | +75.7% | +70.7% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 644.73µs | +54.3% | +74.5% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 9.54µs | +74.3% | +49.6% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 77.17µs | +61.7% | +84.6% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 767.57µs | +101.3% | +120.2% ⚠︎ | 285.01µs | 779.49µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.394ms | +90.6% | +113.4% ⚠︎ | 2.538ms | 6.394ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 25.226ms | +82.7% | +123.4% ⚠︎ | 9.923ms | 25.226ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 3.749ms | +79.7% |  | 2.086ms | 4.387ms | 10 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 106.087ms | +46.4% |  | 62.415ms | 110.796ms | 10 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 17.541ms | +36.7% |  | 12.031ms | 20.271ms | 10 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 362.46µs | +85.9% | +68.2% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.524ms | +85.3% | +105.1% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.943ms | +84.0% | +101.0% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 272.79µs | +85.3% | +126.8% ⚠︎ | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.008ms | +126.5% | +100.6% ⚠︎ | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 64.58µs | +78.9% | +88.6% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 648.04µs | +76.2% | +83.8% ⚠︎ | 278.66µs | 718.31µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.420ms | +70.5% | +65.7% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 76.32µs | +85.9% | +75.8% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 764.44µs | +83.1% | +76.8% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.020ms | +84.4% | +69.0% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 39.58µs | +83.6% | +52.2% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 387.11µs | +88.2% | +53.7% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.057ms | +85.8% | +44.5% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.27µs | +76.0% | +128.8% ⚠︎ | 0.11µs | 0.29µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.46µs | +71.6% | +119.0% ⚠︎ | 0.20µs | 0.49µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.68µs | +70.7% | +126.8% ⚠︎ | 1.09µs | 2.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.64µs | +67.1% | +25.3% ⚠︎ | 0.27µs | 0.70µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.23µs | +88.0% | +41.9% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 29.70µs | +93.7% | +43.9% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 140.38µs | +47.5% | +45.3% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 786.48µs | +64.2% | +34.1% ⚠︎ | 346.91µs | 916.29µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.723ms | +91.9% | +47.4% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 207.53µs | +101.7% | +97.3% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.555ms | +89.1% | +65.0% ⚠︎ | 1.498ms | 3.904ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 504.85µs | +93.1% | +99.9% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 650.01µs | +70.9% | +61.8% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.897ms | +98.4% | +89.8% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 985.62µs | +112.2% | +116.7% ⚠︎ | 319.30µs | 985.62µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 21.318ms | +90.9% | +77.9% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.572ms | +90.4% | +92.9% ⚠︎ | 1.456ms | 3.906ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.478ms | +69.4% | +87.1% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.124ms | +98.5% | +162.2% ⚠︎ | 1.078ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.271ms | +98.0% | +106.6% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 21.643ms | +90.4% | +163.9% ⚠︎ | 7.908ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 22.763ms | +81.6% | +135.8% ⚠︎ | 9.049ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.548ms | +84.4% | +103.0% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.082ms | +99.8% | +131.1% ⚠︎ | 1.044ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 9.879ms | +68.4% | +100.2% ⚠︎ | 4.115ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.793ms | +52.3% | +46.9% ⚠︎ | 1.109ms | 1.793ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 2.774ms | +135.9% | +140.3% ⚠︎ | 1.027ms | 2.774ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 8.515ms | +199.9% | +276.1% ⚠︎ | 2.593ms | 8.515ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 324.26µs | +62.8% | +129.0% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.783ms | +62.1% | +107.9% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 272.684ms | +70.0% | +67.6% ⚠︎ | 115.601ms | 315.896ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 13.005ms | +50.1% | +43.7% ⚠︎ | 5.344ms | 13.881ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.34µs | +85.4% | +93.6% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.37µs | +66.7% | +64.1% ⚠︎ | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 40.40µs | +101.7% | +31.0% ⚠︎ | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 9.44µs | +96.9% | +190.4% ⚠︎ | 2.70µs | 9.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 23.16µs | +57.2% | +66.2% ⚠︎ | 12.03µs | 24.35µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 93.48µs | +98.4% | +197.5% ⚠︎ | 25.82µs | 93.48µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 275.60µs | +36.6% | -14.1% ⚠︎ | 138.29µs | 347.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 5.838ms | +33.6% | +88.0% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 40.051ms | +29.8% | +125.7% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 440.549ms | +19.8% | +99.0% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 634.68µs | +150.0% | +115.6% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 928.26µs | +109.1% | +87.0% ⚠︎ | 315.10µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 4.447ms | +66.7% | +94.9% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 590.85µs | +118.9% | +116.2% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.500ms | +84.4% | +105.5% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 12.605ms | -6.4% | +31.6% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 614.58µs | +145.1% | +92.1% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.233ms | +124.8% | +112.5% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 7.693ms | +4.2% | +44.2% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 321.84µs | +160.0% | +148.4% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 577.09µs | +123.0% | +113.7% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.510ms | +105.1% | +112.7% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 25.51µs | +156.6% | +201.7% ⚠︎ | 6.31µs | 25.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 42.70µs | +109.4% | +101.6% ⚠︎ | 14.38µs | 42.70µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 275.46µs | +93.1% | +68.6% ⚠︎ | 101.89µs | 288.07µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 718.73µs | +123.5% | +135.0% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.126ms | +113.2% | +77.3% ⚠︎ | 366.31µs | 1.271ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.288ms | -12.5% | +29.2% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 252.72µs | +72.9% | +67.7% ⚠︎ | 108.91µs | 274.93µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.229ms | +68.5% | +68.4% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.123ms | +68.9% | +65.4% ⚠︎ | 503.83µs | 1.189ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 317.60µs | +75.9% | +97.0% ⚠︎ | 125.86µs | 330.48µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.707ms | +70.7% | +84.1% ⚠︎ | 1.144ms | 2.744ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.365ms | +71.6% | +80.1% ⚠︎ | 581.91µs | 1.402ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 343.89µs | +81.2% | +77.2% ⚠︎ | 145.23µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 25.650ms | +66.9% | +52.4% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 596.845ms | +50.0% | +16.8% ⚠︎ | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 240.98µs | +78.2% | +83.6% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.977ms | +74.0% | +100.6% ⚠︎ | 786.61µs | 1.977ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 1.006ms | +77.9% | +100.6% ⚠︎ | 391.90µs | 1.006ms | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 210.09µs | +101.2% |  | 98.43µs | 215.84µs | 19 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 960.16µs | +105.1% |  | 457.68µs | 1.006ms | 19 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 229.41µs | +95.1% |  | 108.43µs | 237.00µs | 19 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.017ms | +94.1% |  | 481.00µs | 1.038ms | 19 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.413ms | +72.9% | +98.2% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.399ms | +68.7% | +105.5% ⚠︎ | 1.513ms | 3.883ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.362ms | +72.2% | +112.2% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.586ms | +80.7% | +118.2% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.150ms | +75.6% | +103.4% ⚠︎ | 866.42µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.409ms | +88.2% | +113.5% ⚠︎ | 1.394ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.295ms | +87.4% | +116.7% ⚠︎ | 1.382ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 244.56µs | +58.2% | +108.5% ⚠︎ | 110.17µs | 308.72µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 140.05µs | +67.5% | +117.2% ⚠︎ | 63.40µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.708ms | +79.5% | +116.5% ⚠︎ | 736.21µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.898ms | +93.3% | +78.5% ⚠︎ | 747.65µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.971ms | +85.1% | +111.0% ⚠︎ | 758.81µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 49.78µs | +70.8% | +99.1% ⚠︎ | 21.24µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 50.69µs | +63.6% | +103.1% ⚠︎ | 21.99µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 67.14µs | +66.5% | +77.4% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.508ms | +88.8% | +117.4% ⚠︎ | 635.40µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
