## aui-perf nightly record

_71 points · 2026-09-03T05:27:14.273Z to 2026-11-12T04:31:12.702Z · latest runner: AMD EPYC 7763 64-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 878.77µs | +85.3% | +46.1% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.236ms | +63.8% | +80.5% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 58.39µs | +83.2% | +74.9% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 654.72µs | +84.4% | +74.9% ⚠︎ | 283.89µs | 654.72µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 10.298ms | +75.5% | +75.6% ⚠︎ | 4.419ms | 10.298ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 289.54µs | +100.8% | +84.0% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.578ms | +80.1% | +78.1% ⚠︎ | 1.102ms | 2.578ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 10.154ms | +65.8% | +76.0% ⚠︎ | 4.374ms | 10.154ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 9.92µs | +62.1% | +51.5% ⚠︎ | 4.36µs | 9.92µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 87.97µs | +75.6% | +66.5% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 348.01µs | +92.0% | +66.7% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 141.65µs |  |  | 35.87µs | 142.03µs | 7 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 85.03µs |  |  | 17.71µs | 85.03µs | 7 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 86.10µs |  |  | 16.08µs | 86.10µs | 7 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 348.12µs |  |  | 123.04µs | 348.12µs | 7 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 75.26µs | +86.1% | +115.5% ⚠︎ | 30.81µs | 75.26µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 724.04µs | +92.9% | +112.6% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 10.47µs | +72.5% | +124.8% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 86.47µs | +65.5% | +128.9% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 775.76µs | +91.6% | +46.4% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.123ms | +48.3% | +29.4% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 24.407ms | +60.0% | +30.6% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 366.16µs | +54.3% | +9.2% | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.549ms | +47.4% | +16.0% ⚠︎ | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 14.192ms | +48.2% | +16.0% ⚠︎ | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 292.71µs | +71.0% |  | 102.57µs | 292.71µs | 21 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.447ms | +121.2% |  | 642.90µs | 2.447ms | 21 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 71.30µs | +97.3% | +158.5% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 715.19µs | +90.1% | +131.8% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.860ms | +92.8% | +128.9% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 82.07µs | +111.7% | +145.3% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 833.08µs | +106.7% | +145.6% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.389ms | +103.4% | +144.9% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 42.88µs | +93.7% | +116.3% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 421.89µs | +101.2% | +111.7% ⚠︎ | 158.01µs | 421.89µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.231ms | +106.5% | +108.5% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | +85.7% | +178.6% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.47µs | +89.5% | +143.4% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.46µs | +28.9% | +114.1% ⚠︎ | 1.09µs | 2.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.68µs | +84.5% | +98.9% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.51µs | +111.5% | +112.6% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 31.83µs | +110.5% | +114.9% ⚠︎ | 12.04µs | 31.83µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 148.42µs | +58.1% | +101.1% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 877.47µs | +93.8% | +84.5% ⚠︎ | 346.91µs | 877.47µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.839ms | +94.4% | +89.9% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 208.98µs | +125.3% |  | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.719ms | +112.9% | +156.6% ⚠︎ | 1.434ms | 3.719ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 516.21µs | +101.7% | +132.6% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 738.31µs | +109.2% | +149.9% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.995ms | +115.2% | +145.5% ⚠︎ | 2.767ms | 7.995ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 941.46µs | +124.4% |  | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 25.457ms | +121.7% | +163.4% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.751ms | +98.9% | +143.4% ⚠︎ | 1.456ms | 3.751ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.860ms | +122.3% | +172.9% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.532ms | +124.3% | +235.5% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.813ms | +124.1% | +166.8% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 22.986ms | +92.1% | +202.3% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 24.553ms | +80.6% | +182.9% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.659ms | +136.3% | +224.3% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.633ms | +137.1% | +253.9% ⚠︎ | 1.019ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 11.468ms | +63.1% | +174.6% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.211ms | -7.6% | +7.5% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.894ms | +24.8% | +78.5% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.328ms | +37.8% | +36.4% ⚠︎ | 2.219ms | 4.917ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 364.98µs | +76.5% | +216.1% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.948ms | +22.6% | +174.5% ⚠︎ | 1.053ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 311.004ms | +69.0% | +92.8% ⚠︎ | 115.601ms | 311.004ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 13.358ms | +39.0% | +151.1% ⚠︎ | 5.191ms | 13.358ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.38µs | +87.9% | +137.8% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.68µs | +25.2% | +90.0% ⚠︎ | 4.82µs | 10.68µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 47.83µs | +44.5% | +144.2% ⚠︎ | 14.86µs | 47.83µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.44µs | +54.3% | +149.0% ⚠︎ | 2.56µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 22.49µs | +6.5% | +113.5% ⚠︎ | 10.50µs | 22.49µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 63.12µs | +39.7% | +154.3% ⚠︎ | 24.16µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 311.34µs | +27.1% | +37.2% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 8.611ms | +89.3% | +332.8% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 56.308ms | +98.2% | +326.5% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 561.414ms | +52.4% | +170.5% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 673.14µs | +149.1% | +236.0% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 966.93µs | +101.6% | +186.0% ⚠︎ | 314.68µs | 966.93µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 5.904ms | +87.5% | +249.1% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 668.57µs | +135.4% | +244.2% ⚠︎ | 177.60µs | 668.57µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.857ms | +124.6% | +243.3% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 20.626ms | +17.3% | +332.9% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 710.78µs | +149.7% | +311.6% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.290ms | +141.7% | +227.3% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 15.089ms | +31.8% | +463.3% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 344.03µs | +144.8% | +265.5% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 582.62µs | +116.2% | +212.4% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 5.662ms | +157.7% | +337.8% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 25.21µs | +161.2% | +269.1% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 42.13µs | +103.6% | +190.1% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 279.92µs | +96.2% | +172.3% ⚠︎ | 101.89µs | 279.92µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 760.55µs | +212.4% | +295.9% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.221ms | +75.4% | +210.8% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 13.244ms | -12.0% | +415.7% ⚠︎ | 2.647ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 268.54µs | +84.9% | +99.4% ⚠︎ | 108.91µs | 268.54µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.284ms | +73.3% | +86.2% ⚠︎ | 999.64µs | 2.284ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.152ms | +81.5% | +87.8% ⚠︎ | 503.83µs | 1.152ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 325.02µs | +91.5% | +45.2% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.680ms | +70.7% | +37.5% ⚠︎ | 1.144ms | 2.680ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.354ms | +69.1% | +37.2% ⚠︎ | 581.91µs | 1.354ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 356.77µs | +110.0% | +153.1% ⚠︎ | 135.97µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 28.310ms | +84.0% | +129.1% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 711.084ms | +71.0% | +131.0% ⚠︎ | 290.173ms | 711.084ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 243.98µs | +81.8% | +20.9% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.901ms | +64.2% | +15.6% ⚠︎ | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 965.55µs | +53.1% | +12.9% ⚠︎ | 391.90µs | 1.025ms | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 215.84µs |  |  | 166.27µs | 215.84µs | 3 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 1.006ms |  |  | 773.16µs | 1.006ms | 3 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 237.00µs |  |  | 181.76µs | 237.00µs | 3 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.038ms |  |  | 810.78µs | 1.038ms | 3 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 4.032ms | +83.2% | +162.7% ⚠︎ | 1.470ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.823ms | +94.6% | +147.2% ⚠︎ | 1.491ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.908ms | +94.5% | +162.2% ⚠︎ | 1.433ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 4.087ms | +122.1% | +181.9% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.503ms | +97.1% | +180.6% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.488ms | +99.2% | +146.9% ⚠︎ | 1.309ms | 3.488ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.380ms | +100.7% | +145.6% ⚠︎ | 1.307ms | 3.380ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 251.60µs | +39.3% | +113.8% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 153.96µs | +109.5% | +140.9% ⚠︎ | 60.96µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.734ms | +100.2% | +131.9% ⚠︎ | 689.25µs | 1.737ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 2.141ms | +107.8% | +178.2% ⚠︎ | 712.81µs | 2.141ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.220ms | +116.2% | +186.8% ⚠︎ | 715.83µs | 2.220ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 55.97µs | +91.3% | +157.1% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 56.01µs | +83.4% | +152.0% ⚠︎ | 21.05µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 75.53µs | +60.9% | +113.3% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.571ms | +84.4% | +133.9% ⚠︎ | 587.81µs | 1.571ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
