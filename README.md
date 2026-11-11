## aui-perf nightly record

_70 points · 2026-09-03T05:27:14.273Z to 2026-11-11T04:30:44.339Z · latest runner: AMD EPYC 9V74 80-Core Processor · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 695.42µs | +72.7% | +15.2% ⚠︎ | 367.63µs | 862.37µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 997.02µs | +81.7% | +46.4% ⚠︎ | 516.00µs | 1.214ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 45.63µs | +83.5% | +38.4% ⚠︎ | 23.60µs | 55.70µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 531.31µs | +70.6% | +44.4% ⚠︎ | 283.89µs | 632.06µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 8.152ms | +71.3% | +41.5% ⚠︎ | 4.419ms | 9.767ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 222.87µs | +79.1% | +44.9% ⚠︎ | 118.58µs | 276.41µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 2.050ms | +77.2% | +44.4% ⚠︎ | 1.102ms | 2.468ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 8.161ms | +75.4% | +43.3% ⚠︎ | 4.374ms | 9.720ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 8.28µs | +76.4% | +26.3% ⚠︎ | 4.36µs | 9.74µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 69.24µs | +72.8% | +29.4% ⚠︎ | 36.02µs | 86.58µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 273.43µs | +74.5% | +30.3% ⚠︎ | 141.91µs | 343.94µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 79.21µs |  |  | 35.87µs | 142.03µs | 6 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 43.67µs |  |  | 17.71µs | 80.72µs | 6 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 42.68µs |  |  | 16.08µs | 81.21µs | 6 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 259.42µs |  |  | 123.04µs | 320.89µs | 6 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 54.28µs | +66.4% | +52.3% ⚠︎ | 30.81µs | 74.73µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 535.53µs | +66.3% | +54.1% ⚠︎ | 302.25µs | 675.79µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 7.71µs | +91.4% | +67.7% ⚠︎ | 3.81µs | 9.81µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 63.77µs | +78.1% | +69.9% ⚠︎ | 32.88µs | 82.29µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 589.48µs | +89.0% | +13.4% ⚠︎ | 285.01µs | 741.59µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.105ms | +80.6% | +8.5% | 2.538ms | 5.995ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.991ms | +79.9% | +6.8% | 9.923ms | 23.876ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 290.91µs | +77.4% | -13.5% ⚠︎ | 141.46µs | 384.24µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.824ms | +74.7% | -8.9% | 1.346ms | 3.616ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 11.179ms | +73.6% | -9.4% | 5.326ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 220.98µs | +91.6% |  | 102.57µs | 275.23µs | 20 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.658ms | +91.2% |  | 642.90µs | 1.832ms | 20 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 50.50µs | +75.3% | +81.5% ⚠︎ | 26.72µs | 69.24µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 508.08µs | +70.0% | +65.5% ⚠︎ | 278.66µs | 702.35µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.690ms | +67.7% | +61.3% ⚠︎ | 1.497ms | 3.687ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 60.46µs | +89.3% | +82.0% ⚠︎ | 29.73µs | 79.59µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 611.49µs | +89.5% | +79.5% ⚠︎ | 302.89µs | 794.04µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 3.187ms | +86.4% | +69.9% ⚠︎ | 1.603ms | 4.156ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 31.64µs | +81.4% | +58.0% ⚠︎ | 16.04µs | 42.20µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 301.39µs | +76.0% | +50.1% ⚠︎ | 158.01µs | 419.74µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.629ms | +77.3% | +51.5% ⚠︎ | 851.76µs | 2.200ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.21µs | +80.3% | +105.7% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.38µs | +78.7% | +93.6% ⚠︎ | 0.19µs | 0.46µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 2.09µs | +73.9% | +80.5% ⚠︎ | 1.09µs | 2.42µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.49µs | +65.0% | +42.8% ⚠︎ | 0.27µs | 0.66µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.48µs | +73.6% | +48.5% ⚠︎ | 1.36µs | 3.45µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 23.03µs | +79.1% | +54.6% ⚠︎ | 12.04µs | 31.77µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 113.60µs | +74.9% | +54.9% ⚠︎ | 59.12µs | 144.32µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 590.01µs | +61.1% | +23.5% ⚠︎ | 346.91µs | 813.90µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 2.115ms | +72.7% |  | 1.133ms | 2.819ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 160.81µs | +88.3% |  | 79.43µs | 206.86µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.759ms | +71.4% |  | 1.434ms | 3.699ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 392.38µs | +71.2% |  | 211.20µs | 513.94µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 508.33µs | +61.1% |  | 288.59µs | 715.47µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 6.103ms | +81.2% |  | 2.767ms | 7.934ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 759.45µs | +100.4% |  | 319.30µs | 933.63µs | 30 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 16.572ms | +83.4% |  | 8.393ms | 24.164ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.763ms | +76.7% |  | 1.456ms | 3.726ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.821ms | +63.6% |  | 1.041ms | 2.595ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 2.363ms | +86.9% | +130.5% ⚠︎ | 1.023ms | 3.089ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.509ms | +77.2% | +80.3% ⚠︎ | 1.335ms | 3.319ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 16.882ms | +73.1% | +128.6% ⚠︎ | 7.343ms | 21.273ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 18.229ms | +66.6% | +108.9% ⚠︎ | 8.611ms | 22.844ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.026ms | +120.2% | +103.8% ⚠︎ | 440.23µs | 1.530ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 2.168ms | +99.9% | +109.9% ⚠︎ | 1.019ms | 3.197ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 7.556ms | +71.7% | +83.1% ⚠︎ | 4.065ms | 10.652ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.306ms | +17.2% | +16.7% ⚠︎ | 1.104ms | 1.311ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.452ms | +40.6% | +37.2% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 4.202ms | +41.3% | +51.5% ⚠︎ | 2.219ms | 4.917ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 258.71µs | +119.5% | +122.6% ⚠︎ | 112.80µs | 321.68µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 2.160ms | +87.6% | +105.5% ⚠︎ | 1.053ms | 2.609ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 216.997ms | +76.6% | +37.6% ⚠︎ | 115.601ms | 292.617ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 10.667ms | +85.5% | +104.9% ⚠︎ | 5.191ms | 12.697ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.88µs | +79.0% | +88.7% ⚠︎ | 0.99µs | 2.21µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 9.39µs | +80.4% | +66.7% ⚠︎ | 4.82µs | 10.60µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 36.91µs | +100.2% | +87.9% ⚠︎ | 14.86µs | 42.31µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 7.33µs | +90.4% | +183.2% ⚠︎ | 2.56µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 19.99µs | +54.2% | +86.2% ⚠︎ | 10.50µs | 21.12µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 72.69µs | +91.6% | +194.2% ⚠︎ | 24.16µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 251.98µs | +63.5% | +9.0% | 138.29µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.817ms | +143.3% | +140.0% ⚠︎ | 1.854ms | 7.052ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 31.791ms | +118.7% | +139.9% ⚠︎ | 13.202ms | 49.121ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 388.971ms | +76.6% | +86.2% ⚠︎ | 181.587ms | 499.639ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 441.85µs | +131.7% | +123.7% ⚠︎ | 183.67µs | 627.33µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 702.04µs | +115.7% | +114.2% ⚠︎ | 314.68µs | 907.81µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.349ms | +120.5% | +111.4% ⚠︎ | 1.423ms | 3.726ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 448.84µs | +140.6% | +140.0% ⚠︎ | 177.60µs | 596.08µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.184ms | +119.4% | +122.3% ⚠︎ | 525.40µs | 1.632ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 12.740ms | +171.5% | +184.7% ⚠︎ | 4.572ms | 17.584ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 428.33µs | +148.0% | +149.7% ⚠︎ | 165.84µs | 622.49µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 794.16µs | +105.7% | +105.9% ⚠︎ | 365.89µs | 1.125ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 8.031ms | +194.4% | +188.4% ⚠︎ | 2.541ms | 11.452ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 216.95µs | +157.2% | +132.2% ⚠︎ | 81.54µs | 311.18µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 405.86µs | +117.0% | +118.2% ⚠︎ | 173.27µs | 542.58µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.417ms | +82.2% | +95.1% ⚠︎ | 1.158ms | 3.021ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 12.97µs | +95.6% | +94.1% ⚠︎ | 6.31µs | 23.63µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 26.84µs | +76.8% | +88.9% ⚠︎ | 14.38µs | 40.29µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 208.22µs | +85.1% | +101.3% ⚠︎ | 101.89µs | 274.89µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 451.85µs | +152.8% | +143.3% ⚠︎ | 172.05µs | 671.06µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 845.77µs | +122.4% | +126.1% ⚠︎ | 360.32µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 7.485ms | +163.3% | +173.8% ⚠︎ | 2.568ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 201.93µs | +75.5% | +43.5% ⚠︎ | 108.91µs | 258.25µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.825ms | +74.6% | +44.4% ⚠︎ | 999.64µs | 2.227ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 903.17µs | +68.7% | +41.4% ⚠︎ | 503.83µs | 1.127ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 248.32µs | +81.3% | +6.3% | 125.86µs | 301.15µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.144ms | +72.9% | +5.0% | 1.144ms | 2.535ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.083ms | +73.3% | +4.9% | 581.91µs | 1.293ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 268.10µs | +71.7% | +82.4% ⚠︎ | 135.97µs | 347.47µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 20.993ms | +78.6% | +67.3% ⚠︎ | 10.932ms | 26.387ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 465.486ms | +51.3% | +45.5% ⚠︎ | 290.173ms | 674.323ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 188.16µs | +79.1% | -9.7% | 93.28µs | 235.65µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.569ms | +76.2% | -8.6% | 786.61µs | 1.982ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 797.84µs | +77.0% | -10.2% ⚠︎ | 391.90µs | 1.025ms | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 166.27µs |  |  | 166.27µs | 207.97µs | 2 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 773.16µs |  |  | 773.16µs | 986.86µs | 2 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 181.76µs |  |  | 181.76µs | 230.75µs | 2 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 810.78µs |  |  | 810.78µs | 1.011ms | 2 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.699ms | +65.0% | +80.0% ⚠︎ | 1.470ms | 3.562ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.776ms | +71.2% | +83.1% ⚠︎ | 1.491ms | 3.575ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.685ms | +69.6% | +85.4% ⚠︎ | 1.433ms | 3.527ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.733ms | +88.9% | +94.2% ⚠︎ | 1.368ms | 3.724ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.707ms | +82.4% | +92.8% ⚠︎ | 826.58µs | 2.223ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.532ms | +72.2% | +85.1% ⚠︎ | 1.309ms | 3.314ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.549ms | +72.3% | +91.6% ⚠︎ | 1.307ms | 3.318ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 201.98µs | +67.3% | +76.3% ⚠︎ | 110.17µs | 252.76µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 109.27µs | +65.8% | +77.2% ⚠︎ | 60.96µs | 143.94µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.327ms | +67.6% | +84.5% ⚠︎ | 689.25µs | 1.737ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.427ms | +77.5% | +95.4% ⚠︎ | 712.81µs | 1.985ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.469ms | +82.1% | +98.6% ⚠︎ | 715.83µs | 2.161ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 38.53µs | +67.8% | +83.9% ⚠︎ | 20.86µs | 54.07µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 40.10µs | +70.1% | +88.6% ⚠︎ | 21.05µs | 54.33µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 54.60µs | +61.8% | +58.3% ⚠︎ | 32.06µs | 71.24µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 1.154ms | +76.2% | +78.5% ⚠︎ | 587.81µs | 1.537ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
