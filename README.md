## aui-perf nightly record

_75 points · 2026-09-03T05:27:14.273Z to 2026-11-16T04:35:56.765Z · latest runner: Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 852.04µs | +126.6% | +70.6% ⚠︎ | 367.63µs | 878.77µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 1.216ms | +135.6% | +107.9% ⚠︎ | 516.00µs | 1.236ms | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 58.12µs | +145.0% | +112.0% ⚠︎ | 23.60µs | 58.39µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 684.93µs | +138.5% | +108.2% ⚠︎ | 283.89µs | 684.93µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 10.600ms | +135.6% | +109.1% ⚠︎ | 4.419ms | 10.600ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 287.26µs | +139.6% | +109.0% ⚠︎ | 118.58µs | 289.54µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.673ms | +138.7% | +110.1% ⚠︎ | 1.102ms | 2.673ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 10.547ms | +132.6% | +107.0% ⚠︎ | 4.374ms | 10.547ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 10.13µs | +131.7% | +91.9% ⚠︎ | 4.36µs | 10.13µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 82.80µs | +121.8% | +99.3% ⚠︎ | 36.02µs | 87.97µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 333.46µs | +126.9% | +105.1% ⚠︎ | 141.91µs | 348.01µs | 30 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 108.18µs | +201.6% |  | 35.87µs | 142.03µs | 11 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 64.10µs | +261.9% |  | 17.71µs | 85.03µs | 11 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 63.92µs | +297.6% |  | 16.08µs | 86.10µs | 11 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 321.38µs | +161.2% |  | 123.04µs | 348.12µs | 11 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 76.80µs | +149.2% | +105.5% ⚠︎ | 30.81µs | 76.80µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 702.62µs | +132.0% | +89.3% ⚠︎ | 302.25µs | 724.04µs | 30 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 10.23µs | +168.9% | +115.7% ⚠︎ | 3.81µs | 10.47µs | 30 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 82.56µs | +150.9% | +99.8% ⚠︎ | 32.88µs | 86.47µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 744.39µs | +157.0% | +113.8% ⚠︎ | 285.01µs | 775.76µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.951ms | +126.6% | +95.0% ⚠︎ | 2.538ms | 6.123ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 23.634ms | +127.6% | +96.3% ⚠︎ | 9.923ms | 24.407ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 360.41µs | +134.8% | +72.8% ⚠︎ | 141.46µs | 366.16µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.438ms | +129.8% | +84.7% ⚠︎ | 1.346ms | 3.549ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 13.386ms | +125.0% | +75.0% ⚠︎ | 5.326ms | 14.192ms | 30 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 275.54µs | +152.5% |  | 102.57µs | 292.71µs | 25 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 2.062ms | +162.4% |  | 642.90µs | 2.447ms | 25 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 69.69µs | +160.8% | +133.7% ⚠︎ | 26.72µs | 71.30µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 711.94µs | +155.4% | +113.9% ⚠︎ | 278.66µs | 715.19µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 3.828ms | +155.6% | +110.4% ⚠︎ | 1.497ms | 3.860ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 76.92µs | +152.3% | +121.9% ⚠︎ | 29.73µs | 82.07µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 777.89µs | +150.8% | +116.3% ⚠︎ | 302.89µs | 833.08µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 4.239ms | +157.8% | +117.5% ⚠︎ | 1.603ms | 4.389ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 40.64µs | +153.4% | +87.1% ⚠︎ | 16.04µs | 42.88µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 397.43µs | +151.5% | +94.8% ⚠︎ | 158.01µs | 423.12µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 2.190ms | +157.1% | +90.6% ⚠︎ | 851.76µs | 2.231ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.28µs | +150.4% | +153.7% ⚠︎ | 0.10µs | 0.28µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.47µs | +141.2% | +127.1% ⚠︎ | 0.19µs | 0.47µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.55µs | +127.7% | +101.3% ⚠︎ | 1.09µs | 2.55µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.68µs | +125.1% | +84.7% ⚠︎ | 0.27µs | 0.68µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 3.46µs | +150.7% | +89.1% ⚠︎ | 1.36µs | 3.51µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 30.72µs | +155.2% | +90.2% ⚠︎ | 12.04µs | 31.89µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 147.55µs | +149.6% | +101.8% ⚠︎ | 59.12µs | 148.42µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 903.49µs | +160.4% | +99.4% ⚠︎ | 346.91µs | 903.49µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.767ms | +144.3% | +133.6% ⚠︎ | 1.133ms | 2.839ms | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 186.44µs | +130.4% | +77.5% ⚠︎ | 79.43µs | 208.98µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 3.650ms | +143.7% | +144.8% ⚠︎ | 1.434ms | 3.902ms | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 463.94µs | +119.7% | +107.0% ⚠︎ | 211.20µs | 516.21µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 699.63µs | +142.4% | +110.5% ⚠︎ | 288.59µs | 738.31µs | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 7.007ms | +122.5% | +133.5% ⚠︎ | 2.767ms | 8.120ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 801.37µs | +121.5% | +62.8% ⚠︎ | 319.30µs | 941.46µs | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 23.619ms | +181.4% | +133.5% ⚠︎ | 8.393ms | 25.457ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 3.902ms | +168.0% | +148.2% ⚠︎ | 1.456ms | 3.902ms | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 2.720ms | +161.3% | +131.1% ⚠︎ | 1.041ms | 2.860ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 2.978ms | +151.1% | +171.3% ⚠︎ | 1.023ms | 3.532ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 3.215ms | +140.9% | +123.8% ⚠︎ | 1.335ms | 3.813ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 20.575ms | +126.8% | +163.7% ⚠︎ | 7.343ms | 22.986ms | 30 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 21.580ms | +110.4% | +137.1% ⚠︎ | 8.611ms | 24.553ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.508ms | +242.5% | +148.1% ⚠︎ | 440.23µs | 1.659ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 3.106ms | +195.9% | +171.5% ⚠︎ | 1.019ms | 3.633ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 10.033ms | +143.8% | +122.5% ⚠︎ | 4.065ms | 11.468ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.170ms | -1.8% | +2.7% | 1.104ms | 1.356ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.916ms | +86.4% | +77.8% ⚠︎ | 1.027ms | 2.021ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.642ms | +66.6% | +93.7% ⚠︎ | 2.219ms | 4.952ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 336.54µs | +195.0% | +150.5% ⚠︎ | 112.80µs | 364.98µs | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.771ms | +159.1% | +126.0% ⚠︎ | 1.053ms | 2.948ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 312.212ms | +169.7% | +106.5% ⚠︎ | 115.601ms | 312.212ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 13.429ms | +151.3% | +116.1% ⚠︎ | 5.308ms | 13.429ms | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 2.36µs | +134.6% | +110.3% ⚠︎ | 0.99µs | 2.38µs | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 10.92µs | +126.4% | +107.7% ⚠︎ | 4.82µs | 10.92µs | 30 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 48.41µs | +186.2% | +201.3% ⚠︎ | 14.86µs | 48.41µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 6.00µs | +61.9% | +115.2% ⚠︎ | 2.56µs | 7.33µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 23.76µs | +97.4% | +110.8% ⚠︎ | 10.50µs | 23.76µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 57.88µs | +58.7% | +118.7% ⚠︎ | 24.16µs | 72.69µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 302.42µs | +118.7% | +24.2% ⚠︎ | 138.29µs | 322.31µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 6.270ms | +238.2% | +143.5% ⚠︎ | 1.854ms | 8.611ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 39.395ms | +182.2% | +150.7% ⚠︎ | 13.632ms | 56.308ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 415.303ms | +99.7% | +57.5% ⚠︎ | 181.587ms | 561.414ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 629.95µs | +238.6% | +199.8% ⚠︎ | 183.67µs | 673.14µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 929.06µs | +194.8% | +146.2% ⚠︎ | 314.68µs | 1.039ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 4.492ms | +215.7% | +154.0% ⚠︎ | 1.423ms | 5.904ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 653.38µs | +262.0% | +209.0% ⚠︎ | 177.60µs | 675.28µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.705ms | +218.8% | +160.6% ⚠︎ | 525.40µs | 1.857ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 12.579ms | +163.0% | +117.6% ⚠︎ | 4.572ms | 20.626ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 583.67µs | +251.9% | +205.7% ⚠︎ | 165.84µs | 710.78µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 1.215ms | +232.1% | +197.8% ⚠︎ | 365.89µs | 1.290ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 9.095ms | +257.9% | +151.4% ⚠︎ | 2.541ms | 15.089ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 336.80µs | +300.2% | +213.0% ⚠︎ | 81.54µs | 344.03µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 556.49µs | +214.5% | +160.6% ⚠︎ | 173.27µs | 582.62µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 4.001ms | +245.4% | +172.5% ⚠︎ | 1.158ms | 5.662ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 19.95µs | +216.1% | +146.6% ⚠︎ | 6.31µs | 25.21µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 34.84µs | +142.3% | +87.0% ⚠︎ | 14.38µs | 42.13µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 285.86µs | +180.6% | +95.8% ⚠︎ | 101.89µs | 285.86µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 673.03µs | +275.4% | +227.8% ⚠︎ | 172.05µs | 760.55µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.205ms | +226.1% | +213.1% ⚠︎ | 360.32µs | 1.256ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 8.654ms | +217.3% | +188.8% ⚠︎ | 2.647ms | 15.054ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 267.91µs | +146.0% | +112.9% ⚠︎ | 108.91µs | 270.08µs | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 2.346ms | +134.1% | +105.9% ⚠︎ | 999.64µs | 2.346ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 1.188ms | +134.6% | +105.4% ⚠︎ | 503.83µs | 1.188ms | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 317.28µs | +147.0% | +107.0% ⚠︎ | 125.86µs | 325.02µs | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.704ms | +133.2% | +100.8% ⚠︎ | 1.144ms | 2.704ms | 30 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.371ms | +134.1% | +99.3% ⚠︎ | 581.91µs | 1.371ms | 30 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 342.15µs | +132.8% | +130.9% ⚠︎ | 135.97µs | 356.77µs | 30 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 25.870ms | +135.8% | +115.9% ⚠︎ | 10.932ms | 28.310ms | 30 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 810.218ms | +175.1% | +158.1% ⚠︎ | 290.173ms | 810.218ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 233.02µs | +136.7% | +85.0% ⚠︎ | 93.28µs | 243.98µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.884ms | +122.9% | +83.7% ⚠︎ | 786.61µs | 1.901ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 980.16µs | +127.3% | +84.2% ⚠︎ | 391.90µs | 980.16µs | 30 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 206.88µs |  |  | 163.28µs | 215.84µs | 7 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 964.17µs |  |  | 764.30µs | 1.006ms | 7 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 225.94µs |  |  | 180.38µs | 237.00µs | 7 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 996.40µs |  |  | 801.03µs | 1.038ms | 7 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 3.797ms | +151.6% | +130.6% ⚠︎ | 1.470ms | 4.032ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 3.737ms | +146.4% | +115.5% ⚠︎ | 1.512ms | 3.823ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 3.706ms | +153.1% | +133.2% ⚠︎ | 1.458ms | 3.908ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 3.759ms | +174.8% | +143.7% ⚠︎ | 1.368ms | 4.087ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 2.361ms | +172.5% | +138.0% ⚠︎ | 826.58µs | 2.503ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 3.535ms | +153.5% | +142.2% ⚠︎ | 1.309ms | 3.535ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 3.549ms | +156.7% | +142.9% ⚠︎ | 1.307ms | 3.549ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 301.50µs | +165.6% | +145.5% ⚠︎ | 110.17µs | 301.50µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 118.31µs | +84.3% | +75.5% ⚠︎ | 60.96µs | 153.96µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.901ms | +158.2% | +152.3% ⚠︎ | 689.25µs | 1.901ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 2.155ms | +185.0% | +176.3% ⚠︎ | 712.81µs | 2.155ms | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 2.307ms | +202.1% | +187.8% ⚠︎ | 715.83µs | 2.307ms | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 47.25µs | +117.6% | +105.1% ⚠︎ | 20.86µs | 55.97µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 49.46µs | +121.7% | +113.8% ⚠︎ | 21.05µs | 56.01µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 72.31µs | +120.6% | +97.4% ⚠︎ | 32.06µs | 75.53µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.717ms | +170.2% | +150.5% ⚠︎ | 587.81µs | 1.717ms | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
