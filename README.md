## aui-perf nightly record

_69 points · 2026-09-03T05:27:14.273Z to 2026-11-10T04:30:46.977Z · latest runner: AMD EPYC 7763 64-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 862.37µs | +134.6% | +37.0% ⚠︎ | 367.63µs | 862.37µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.214ms | +129.2% | +74.1% ⚠︎ | 516.00µs | 1.214ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 55.70µs | +121.4% | +67.3% ⚠︎ | 23.60µs | 55.70µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 632.06µs | +116.3% | +69.3% ⚠︎ | 283.89µs | 632.06µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 9.767ms | +111.2% | +66.7% ⚠︎ | 4.419ms | 9.767ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 276.41µs | +124.7% | +74.9% ⚠︎ | 118.58µs | 276.41µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.468ms | +114.7% | +70.2% ⚠︎ | 1.102ms | 2.468ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 9.720ms | +109.2% | +67.6% ⚠︎ | 4.374ms | 9.720ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 9.74µs | +123.7% | +41.4% ⚠︎ | 4.36µs | 9.74µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 86.58µs | +137.1% | +54.3% ⚠︎ | 36.02µs | 86.58µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 343.94µs | +141.1% | +55.4% ⚠︎ | 141.91µs | 343.94µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 142.03µs |  |  | 35.87µs | 142.03µs | 5 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 80.72µs |  |  | 17.71µs | 80.72µs | 5 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 81.21µs |  |  | 16.08µs | 81.21µs | 5 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 320.89µs |  |  | 123.04µs | 320.89µs | 5 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 74.73µs | +128.8% | +118.9% ⚠︎ | 30.81µs | 74.73µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 675.79µs | +111.8% | +99.0% ⚠︎ | 302.25µs | 675.79µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 9.81µs | +126.8% | +128.1% ⚠︎ | 3.81µs | 9.81µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 82.29µs | +129.2% | +133.8% ⚠︎ | 32.88µs | 82.29µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 741.59µs | +160.2% | +40.7% ⚠︎ | 285.01µs | 741.59µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.995ms | +136.2% | +25.3% ⚠︎ | 2.538ms | 5.995ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 23.876ms | +140.6% | +26.2% ⚠︎ | 9.923ms | 23.876ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 350.36µs | +145.7% | +5.0% | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.327ms | +142.8% | +9.8% | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.200ms | +143.1% | +8.8% | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 275.23µs | +168.3% |  | 102.57µs | 275.23µs | 19 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.832ms | +117.0% |  | 642.90µs | 1.832ms | 19 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 69.24µs | +130.2% | +141.1% ⚠︎ | 26.72µs | 69.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 702.35µs | +133.1% | +123.1% ⚠︎ | 278.66µs | 702.35µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.687ms | +138.0% | +119.5% ⚠︎ | 1.497ms | 3.687ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 79.59µs | +127.6% | +136.8% ⚠︎ | 29.73µs | 79.59µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 794.04µs | +123.1% | +127.7% ⚠︎ | 302.89µs | 794.04µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.156ms | +120.2% | +125.0% ⚠︎ | 1.603ms | 4.156ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 42.20µs | +125.8% | +105.6% ⚠︎ | 16.04µs | 42.20µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 419.74µs | +126.3% | +109.7% ⚠︎ | 158.01µs | 419.74µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.200ms | +118.0% | +99.0% ⚠︎ | 851.76µs | 2.200ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | +135.6% | +174.2% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.46µs | +128.1% | +134.4% ⚠︎ | 0.19µs | 0.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.42µs | +119.2% | +100.0% ⚠︎ | 1.09µs | 2.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.66µs | +143.3% | +85.0% ⚠︎ | 0.27µs | 0.66µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.45µs | +130.5% | +90.0% ⚠︎ | 1.36µs | 3.45µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 31.77µs | +129.8% | +95.9% ⚠︎ | 12.04µs | 31.77µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 144.32µs | +95.6% | +96.4% ⚠︎ | 59.12µs | 144.32µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 813.90µs | +92.8% | +74.7% ⚠︎ | 346.91µs | 813.90µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.819ms | +106.9% |  | 1.133ms | 2.819ms | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 206.86µs | +160.4% |  | 79.43µs | 206.86µs | 29 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.699ms | +109.5% |  | 1.434ms | 3.699ms | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 513.94µs | +129.0% |  | 211.20µs | 513.94µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 715.47µs | +115.8% |  | 288.59µs | 715.47µs | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.934ms | +116.3% |  | 2.767ms | 7.934ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 933.63µs | +192.4% |  | 319.30µs | 933.63µs | 29 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 24.164ms | +138.7% |  | 8.393ms | 24.164ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.726ms | +134.6% |  | 1.456ms | 3.726ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.595ms | +130.6% |  | 1.041ms | 2.595ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 3.089ms | +131.8% | +188.6% ⚠︎ | 1.023ms | 3.089ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.319ms | +120.0% | +140.0% ⚠︎ | 1.335ms | 3.319ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 21.273ms | +122.8% | +172.5% ⚠︎ | 7.343ms | 21.273ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 22.844ms | +106.8% | +152.8% ⚠︎ | 8.611ms | 22.844ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.530ms | +188.1% | +160.5% ⚠︎ | 440.23µs | 1.530ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.197ms | +172.9% | +197.7% ⚠︎ | 1.019ms | 3.197ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 10.652ms | +139.2% | +147.9% ⚠︎ | 4.065ms | 10.652ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.190ms | +6.9% | +3.9% | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 2.021ms | +80.6% | +90.8% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.917ms | +79.4% | +73.8% ⚠︎ | 2.219ms | 4.917ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 321.68µs | +170.1% | +173.2% ⚠︎ | 112.80µs | 321.68µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.609ms | +134.7% | +147.4% ⚠︎ | 1.051ms | 2.609ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 292.617ms | +128.0% | +89.8% ⚠︎ | 115.601ms | 292.617ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 12.697ms | +126.2% | +147.3% ⚠︎ | 5.191ms | 12.697ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.21µs | +119.4% | +115.4% ⚠︎ | 0.99µs | 2.21µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.47µs | +89.4% | +80.0% ⚠︎ | 4.82µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 42.31µs | +78.5% | +99.5% ⚠︎ | 14.86µs | 42.31µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.43µs | +109.7% | +145.1% ⚠︎ | 2.56µs | 6.43µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 21.06µs | +54.4% | +90.2% ⚠︎ | 10.50µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 62.72µs | +107.4% | +152.0% ⚠︎ | 24.16µs | 62.72µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 277.19µs | +91.4% | +15.9% ⚠︎ | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 7.052ms | +243.9% | +242.3% ⚠︎ | 1.854ms | 7.052ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 49.121ms | +252.5% | +260.2% ⚠︎ | 13.202ms | 49.121ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 499.639ms | +175.2% | +131.2% ⚠︎ | 181.587ms | 499.639ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 627.33µs | +211.1% | +203.2% ⚠︎ | 183.67µs | 627.33µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 907.81µs | +149.2% | +164.6% ⚠︎ | 314.68µs | 907.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.726ms | +118.9% | +130.1% ⚠︎ | 1.423ms | 3.726ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 596.08µs | +192.2% | +208.5% ⚠︎ | 177.60µs | 596.08µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.632ms | +157.8% | +208.9% ⚠︎ | 525.40µs | 1.632ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 17.155ms | +227.4% | +232.1% ⚠︎ | 4.475ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 622.49µs | +217.9% | +240.5% ⚠︎ | 165.84µs | 622.49µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.125ms | +148.5% | +182.5% ⚠︎ | 365.89µs | 1.125ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 10.196ms | +213.6% | +287.7% ⚠︎ | 2.541ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 311.18µs | +261.6% | +241.5% ⚠︎ | 81.54µs | 311.18µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 542.58µs | +159.4% | +182.6% ⚠︎ | 173.27µs | 542.58µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 3.021ms | +123.0% | +130.4% ⚠︎ | 1.158ms | 3.021ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 23.63µs | +247.0% | +258.8% ⚠︎ | 6.31µs | 23.63µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 40.29µs | +157.0% | +172.1% ⚠︎ | 14.21µs | 40.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 274.89µs | +114.5% | +159.8% ⚠︎ | 101.89µs | 274.89µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 671.06µs | +234.7% | +238.1% ⚠︎ | 172.05µs | 671.06µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.256ms | +205.3% | +212.8% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 11.372ms | +248.6% | +274.8% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 258.25µs | +119.7% | +88.3% ⚠︎ | 108.91µs | 258.25µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.227ms | +110.5% | +81.7% ⚠︎ | 999.64µs | 2.227ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.127ms | +110.4% | +81.7% ⚠︎ | 503.83µs | 1.127ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 301.15µs | +134.2% | +31.2% ⚠︎ | 125.86µs | 301.15µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.535ms | +121.7% | +27.5% ⚠︎ | 1.144ms | 2.535ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.293ms | +122.1% | +27.9% ⚠︎ | 581.91µs | 1.293ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 347.47µs | +102.1% | +141.3% ⚠︎ | 135.97µs | 347.47µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 26.387ms | +113.3% | +112.1% ⚠︎ | 10.932ms | 26.387ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 674.323ms | +52.7% | +114.5% ⚠︎ | 290.173ms | 674.323ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 235.65µs | +150.3% | +16.7% ⚠︎ | 93.28µs | 235.65µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.843ms | +133.8% | +10.2% ⚠︎ | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 942.14µs | +132.6% | +7.8% | 391.90µs | 1.025ms | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 207.97µs |  |  | 207.97µs | 207.97µs | 1 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 986.86µs |  |  | 986.86µs | 986.86µs | 1 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 230.75µs |  |  | 230.75µs | 230.75µs | 1 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 1.011ms |  |  | 1.011ms | 1.011ms | 1 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.562ms | +119.3% | +135.1% ⚠︎ | 1.470ms | 3.562ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.575ms | +119.1% | +136.5% ⚠︎ | 1.491ms | 3.575ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.527ms | +113.6% | +143.7% ⚠︎ | 1.433ms | 3.527ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.724ms | +166.8% | +159.7% ⚠︎ | 1.368ms | 3.724ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.223ms | +129.4% | +152.6% ⚠︎ | 826.58µs | 2.223ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.314ms | +126.6% | +131.2% ⚠︎ | 1.309ms | 3.314ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.318ms | +127.7% | +138.4% ⚠︎ | 1.307ms | 3.318ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 252.76µs | +125.0% | +114.2% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 143.94µs | +127.0% | +129.2% ⚠︎ | 60.96µs | 143.94µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.737ms | +130.0% | +135.5% ⚠︎ | 689.25µs | 1.737ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.985ms | +130.5% | +165.8% ⚠︎ | 712.81µs | 1.985ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.161ms | +143.8% | +184.1% ⚠︎ | 715.83µs | 2.161ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 54.07µs | +150.9% | +151.0% ⚠︎ | 20.86µs | 54.07µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 54.33µs | +141.7% | +150.2% ⚠︎ | 21.05µs | 54.33µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 71.24µs | +106.1% | +105.3% ⚠︎ | 32.06µs | 71.24µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.537ms | +123.5% | +131.5% ⚠︎ | 587.81µs | 1.537ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
