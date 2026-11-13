## aui-perf nightly record

_72 points · 2026-09-03T05:27:14.273Z to 2026-11-13T04:30:49.392Z · latest runner: AMD EPYC 7763 64-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 853.65µs | +121.7% | +35.5% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.206ms | +131.7% | +69.7% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 57.20µs | +142.3% | +63.8% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 642.92µs | +126.5% | +66.3% ⚠︎ | 283.89µs | 654.72µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 9.947ms | +125.1% | +64.1% ⚠︎ | 4.419ms | 10.298ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 279.78µs | +135.9% | +77.3% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.514ms | +128.1% | +74.7% ⚠︎ | 1.102ms | 2.578ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 9.824ms | +124.6% | +70.6% ⚠︎ | 4.374ms | 10.154ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 9.66µs | +118.1% | +42.8% ⚠︎ | 4.36µs | 9.92µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 86.03µs | +127.6% | +57.2% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 340.07µs | +129.0% | +58.0% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 139.02µs | +275.2% |  | 35.87µs | 142.03µs | 8 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 80.10µs | +347.1% |  | 17.71µs | 85.03µs | 8 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 80.64µs | +367.5% |  | 16.08µs | 86.10µs | 8 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 314.99µs | +149.7% |  | 123.04µs | 348.12µs | 8 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 74.78µs | +139.0% | +111.4% ⚠︎ | 30.81µs | 75.26µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 668.79µs | +115.6% | +93.3% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 9.88µs | +152.7% | +113.3% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 83.56µs | +148.6% | +116.2% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 755.89µs | +146.7% | +40.9% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 6.007ms | +115.9% | +25.1% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 24.052ms | +111.2% | +25.5% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 352.99µs | +124.4% | +6.1% | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.304ms | +111.2% | +6.9% | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.106ms | +105.7% | +4.7% | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 274.86µs | +148.3% |  | 102.57µs | 292.71µs | 22 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.956ms | +128.8% |  | 642.90µs | 2.447ms | 22 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 70.70µs | +161.3% | +152.0% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 707.86µs | +148.0% | +127.6% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.755ms | +147.2% | +126.1% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 79.64µs | +146.8% | +136.7% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 803.88µs | +148.4% | +134.7% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.212ms | +149.1% | +129.8% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 41.91µs | +145.1% | +106.6% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 416.66µs | +149.3% | +109.6% ⚠︎ | 158.01µs | 421.89µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.189ms | +141.4% | +103.4% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | +144.4% | +172.9% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.45µs | +128.1% | +124.0% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.40µs | +105.5% | +99.3% ⚠︎ | 1.09µs | 2.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.67µs | +122.7% | +86.7% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.49µs | +150.4% | +100.4% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 31.57µs | +157.7% | +103.1% ⚠︎ | 12.04µs | 31.83µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 143.06µs | +130.8% | +90.8% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 823.91µs | +134.8% | +71.8% ⚠︎ | 346.91µs | 877.47µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.809ms | +143.7% | +143.9% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 206.94µs | +153.5% | +110.7% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.902ms | +156.3% | +164.8% ⚠︎ | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 510.30µs | +137.5% | +135.5% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 718.34µs | +139.4% | +125.1% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.198ms | +122.9% | +137.6% ⚠︎ | 2.767ms | 7.995ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 909.04µs | +149.5% | +95.9% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 24.748ms | +185.2% | +163.0% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.627ms | +145.0% | +136.5% ⚠︎ | 1.456ms | 3.751ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.802ms | +159.5% | +147.0% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.106ms | +156.4% | +196.4% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.325ms | +143.0% | +130.5% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 21.700ms | +136.6% | +190.7% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 23.209ms | +122.9% | +165.5% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.500ms | +218.1% | +142.5% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.134ms | +192.0% | +187.7% ⚠︎ | 1.019ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 10.150ms | +142.6% | +133.9% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.214ms | +7.4% | +7.5% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.967ms | +90.4% | +83.7% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.932ms | +90.3% | +88.0% ⚠︎ | 2.219ms | 4.932ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 333.38µs | +188.8% | +175.9% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.665ms | +146.2% | +142.3% ⚠︎ | 1.053ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 301.877ms | +156.3% | +107.6% ⚠︎ | 115.601ms | 311.004ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 12.638ms | +136.5% | +133.8% ⚠︎ | 5.191ms | 13.358ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.30µs | +124.9% | +121.4% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.65µs | +96.2% | +57.6% ⚠︎ | 4.82µs | 10.68µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 39.98µs | +127.9% | +75.6% ⚠︎ | 14.86µs | 47.83µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.44µs | +68.7% | +143.6% ⚠︎ | 2.56µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 21.38µs | +59.9% | +82.2% ⚠︎ | 10.50µs | 22.49µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 62.63µs | +69.9% | +147.4% ⚠︎ | 24.16µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 279.09µs | +93.2% | +12.2% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 7.018ms | +251.7% | +214.9% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 46.450ms | +228.9% | +205.0% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 480.913ms | +108.2% | +104.5% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 624.76µs | +236.0% | +205.5% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 1.039ms | +214.3% | +191.8% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 4.320ms | +191.7% | +161.0% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 675.28µs | +245.4% | +214.0% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.417ms | +162.0% | +124.9% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 15.460ms | +171.2% | +183.5% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 589.66µs | +215.3% | +205.2% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.094ms | +176.7% | +194.3% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 8.416ms | +218.5% | +153.7% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 337.38µs | +245.9% | +253.5% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 538.22µs | +182.9% | +167.3% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.052ms | +129.2% | +123.9% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 23.53µs | +267.8% | +236.4% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 39.95µs | +167.5% | +168.7% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 275.51µs | +150.9% | +158.1% ⚠︎ | 101.89µs | 279.92µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 705.08µs | +309.8% | +285.1% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.094ms | +176.5% | +182.6% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.658ms | +171.5% | +202.8% ⚠︎ | 2.647ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 270.08µs | +141.4% | +92.4% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.267ms | +126.7% | +78.5% ⚠︎ | 999.64µs | 2.284ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.147ms | +127.7% | +76.7% ⚠︎ | 503.83µs | 1.152ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 311.35µs | +132.2% | +31.8% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.583ms | +125.1% | +25.5% ⚠︎ | 1.144ms | 2.680ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.309ms | +116.8% | +25.5% ⚠︎ | 581.91µs | 1.354ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 348.11µs | +134.8% | +142.6% ⚠︎ | 135.97µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 26.365ms | +141.2% | +97.8% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 662.275ms | +122.1% | +102.5% ⚠︎ | 290.173ms | 711.084ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 238.91µs | +130.6% | +13.2% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.859ms | +112.8% | +5.1% | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 945.56µs | +112.5% | +5.7% | 391.90µs | 1.025ms | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 212.80µs |  |  | 166.27µs | 215.84µs | 4 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 983.67µs |  |  | 773.16µs | 1.006ms | 4 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 230.56µs |  |  | 181.76µs | 237.00µs | 4 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.021ms |  |  | 810.78µs | 1.038ms | 4 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.583ms | +111.7% | +139.5% ⚠︎ | 1.470ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.586ms | +117.8% | +140.5% ⚠︎ | 1.512ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.525ms | +117.2% | +145.9% ⚠︎ | 1.445ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.707ms | +148.8% | +158.0% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.223ms | +129.9% | +150.3% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.329ms | +127.0% | +137.0% ⚠︎ | 1.309ms | 3.488ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.312ms | +125.6% | +142.5% ⚠︎ | 1.307ms | 3.380ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 240.28µs | +110.4% | +93.0% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 143.36µs | +121.1% | +130.1% ⚠︎ | 60.96µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.723ms | +118.0% | +139.2% ⚠︎ | 689.25µs | 1.737ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.964ms | +148.9% | +164.7% ⚠︎ | 712.81µs | 2.141ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.052ms | +163.2% | +173.0% ⚠︎ | 715.83µs | 2.220ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 54.52µs | +149.1% | +151.2% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 54.58µs | +143.5% | +148.4% ⚠︎ | 21.05µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 71.83µs | +122.9% | +108.9% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.530ms | +137.9% | +137.5% ⚠︎ | 587.81µs | 1.571ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
