## aui-perf nightly record

_74 points · 2026-09-03T05:27:14.273Z to 2026-11-15T04:30:28.834Z · latest runner: AMD EPYC 7763 64-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 846.09µs | +127.8% | +75.2% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.209ms | +122.2% | +113.2% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 56.29µs | +125.6% | +115.7% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 642.97µs | +117.8% | +114.0% ⚠︎ | 283.89µs | 654.72µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 10.066ms | +115.7% | +114.0% ⚠︎ | 4.419ms | 10.298ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 278.96µs | +124.1% | +123.5% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.516ms | +120.0% | +117.6% ⚠︎ | 1.102ms | 2.578ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 9.862ms | +110.9% | +113.4% ⚠︎ | 4.374ms | 10.154ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 9.63µs | +117.6% | +93.8% ⚠︎ | 4.36µs | 9.92µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 85.72µs | +124.5% | +110.5% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 340.40µs | +137.8% | +110.7% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 139.87µs | +269.7% |  | 35.87µs | 142.03µs | 10 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 81.99µs | +348.9% |  | 17.71µs | 85.03µs | 10 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 82.39µs | +359.5% |  | 16.08µs | 86.10µs | 10 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 313.74µs | +143.5% |  | 123.04µs | 348.12µs | 10 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 70.99µs | +110.2% | +105.2% ⚠︎ | 30.81µs | 75.26µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 655.64µs | +102.2% | +92.5% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 9.78µs | +126.8% | +126.1% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 82.98µs | +130.9% | +126.9% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 744.15µs | +160.4% | +133.0% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.994ms | +133.6% | +113.3% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 23.519ms | +135.5% | +111.5% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 350.58µs | +147.8% | +94.7% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.256ms | +136.7% | +90.6% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.042ms | +140.7% | +94.6% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 270.00µs | +154.4% |  | 102.57µs | 292.71µs | 24 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.188ms | +145.1% |  | 642.90µs | 2.447ms | 24 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 68.74µs | +116.9% | +143.1% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 702.62µs | +124.0% | +122.9% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.711ms | +128.8% | +118.7% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 80.14µs | +111.8% | +143.0% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 800.90µs | +108.9% | +137.0% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.186ms | +107.2% | +125.0% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 41.69µs | +119.0% | +112.3% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 423.12µs | +123.8% | +119.9% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.215ms | +115.7% | +113.4% ⚠︎ | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | +147.2% | +169.4% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.46µs | +128.7% | +129.3% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.40µs | +115.8% | +101.7% ⚠︎ | 1.09µs | 2.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.66µs | +144.6% | +86.7% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.46µs | +131.2% | +93.4% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 31.89µs | +135.4% | +105.4% ⚠︎ | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 144.39µs | +100.6% | +94.6% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 802.79µs | +94.4% | +67.4% ⚠︎ | 346.91µs | 877.47µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.803ms | +103.3% | +142.9% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 207.03µs | +159.0% | +112.8% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.773ms | +111.0% | +155.2% ⚠︎ | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 510.26µs | +122.3% | +135.3% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 714.59µs | +114.0% | +128.3% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 8.120ms | +100.1% | +163.0% ⚠︎ | 2.767ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 933.65µs | +191.2% | +103.0% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 24.471ms | +137.2% | +156.3% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.632ms | +131.6% | +142.0% ⚠︎ | 1.456ms | 3.751ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.800ms | +148.3% | +156.3% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.034ms | +131.1% | +193.5% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.266ms | +120.3% | +124.7% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 21.340ms | +119.6% | +186.8% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 22.453ms | +104.5% | +158.4% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.502ms | +180.2% | +158.7% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.145ms | +168.8% | +194.9% ⚠︎ | 1.019ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 10.116ms | +126.3% | +129.6% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.176ms | +5.6% | +2.7% | 1.104ms | 1.356ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.911ms | +73.1% | +77.6% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.952ms | +72.7% | +104.2% ⚠︎ | 2.219ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 333.09µs | +179.4% | +175.2% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.699ms | +142.7% | +155.1% ⚠︎ | 1.053ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 297.091ms | +129.4% | +106.1% ⚠︎ | 115.601ms | 311.004ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 12.622ms | +127.1% | +143.1% ⚠︎ | 5.308ms | 13.358ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.23µs | +124.0% | +121.7% ⚠︎ | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.45µs | +70.8% | +62.4% ⚠︎ | 4.82µs | 10.68µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 38.46µs | +55.2% | +83.2% ⚠︎ | 14.86µs | 47.83µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.42µs | +96.5% | +145.9% ⚠︎ | 2.56µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 20.08µs | +46.9% | +82.1% ⚠︎ | 10.50µs | 22.49µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 62.64µs | +99.2% | +153.2% ⚠︎ | 24.16µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 271.27µs | +85.1% | +16.7% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 6.890ms | +236.1% | +212.7% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 45.512ms | +226.3% | +195.7% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 467.761ms | +152.5% | +97.9% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 627.61µs | +206.7% | +210.3% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 889.30µs | +143.3% | +155.7% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 4.402ms | +145.5% | +151.3% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 627.09µs | +209.3% | +215.8% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.473ms | +133.0% | +159.3% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 14.345ms | +160.6% | +148.9% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 581.54µs | +197.1% | +191.8% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.136ms | +140.6% | +152.9% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 7.295ms | +126.0% | +145.1% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 320.90µs | +275.5% | +265.6% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 552.30µs | +177.4% | +178.9% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.415ms | +126.0% | +132.7% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 23.74µs | +253.8% | +249.4% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 38.86µs | +152.0% | +159.8% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 281.91µs | +115.8% | +155.7% ⚠︎ | 101.89µs | 281.91µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 721.41µs | +260.9% | +296.4% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.107ms | +151.6% | +159.6% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.198ms | +141.3% | +150.9% ⚠︎ | 2.647ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 260.04µs | +121.0% | +126.5% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.243ms | +111.6% | +111.8% ⚠︎ | 999.64µs | 2.284ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.137ms | +111.0% | +113.2% ⚠︎ | 503.83µs | 1.152ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 317.38µs | +146.0% | +123.7% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.583ms | +122.5% | +103.9% ⚠︎ | 1.144ms | 2.680ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.316ms | +125.2% | +104.4% ⚠︎ | 581.91µs | 1.354ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 352.38µs | +101.3% | +153.7% ⚠︎ | 135.97µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 26.696ms | +116.0% | +113.1% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 659.504ms | +48.0% | +107.2% ⚠︎ | 290.173ms | 711.084ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 239.11µs | +149.7% | +104.3% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.863ms | +130.7% | +96.7% ⚠︎ | 786.61µs | 1.901ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 951.71µs | +129.1% | +93.9% ⚠︎ | 391.90µs | 965.55µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 209.94µs |  |  | 163.28µs | 215.84µs | 6 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 976.59µs |  |  | 764.30µs | 1.006ms | 6 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 232.12µs |  |  | 180.38µs | 237.00µs | 6 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.017ms |  |  | 801.03µs | 1.038ms | 6 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.624ms | +107.2% | +144.5% ⚠︎ | 1.470ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.617ms | +106.9% | +137.7% ⚠︎ | 1.512ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.547ms | +110.3% | +145.4% ⚠︎ | 1.458ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.780ms | +161.0% | +163.8% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.203ms | +129.2% | +150.9% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.416ms | +128.5% | +146.7% ⚠︎ | 1.309ms | 3.488ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.363ms | +123.9% | +156.9% ⚠︎ | 1.307ms | 3.380ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 241.63µs | +104.4% | +109.8% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 146.09µs | +126.8% | +135.3% ⚠︎ | 60.96µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.764ms | +120.5% | +143.8% ⚠︎ | 689.25µs | 1.764ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 2.045ms | +139.0% | +180.3% ⚠︎ | 712.81µs | 2.141ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.156ms | +142.0% | +190.0% ⚠︎ | 715.83µs | 2.220ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 53.74µs | +153.1% | +150.8% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 54.20µs | +146.4% | +149.5% ⚠︎ | 21.05µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 68.48µs | +98.8% | +94.4% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.540ms | +131.6% | +140.9% ⚠︎ | 587.81µs | 1.571ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
