## aui-perf nightly record

_81 points · 2026-09-03T05:27:14.273Z to 2026-11-22T04:30:25.049Z · latest runner: Intel(R) Xeon(R) 6975P-C · Node v26.13.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 547.81µs | -22.2% | +12.1% ⚠︎ | 367.63µs | 878.77µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 811.70µs | -19.7% | +35.3% ⚠︎ | 516.00µs | 1.236ms | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.19µs | -25.1% | +29.0% ⚠︎ | 23.60µs | 58.39µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 364.13µs | -31.3% | +20.9% ⚠︎ | 283.89µs | 684.93µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.707ms | -30.3% | +22.7% ⚠︎ | 4.419ms | 10.600ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.07µs | -29.3% | +21.3% ⚠︎ | 118.58µs | 289.54µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.463ms | -31.2% | +21.0% ⚠︎ | 1.102ms | 2.673ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.682ms | -29.9% | +18.7% ⚠︎ | 4.374ms | 10.547ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.26µs | -24.8% | +26.1% ⚠︎ | 4.36µs | 10.13µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 52.68µs | -25.1% | +32.3% ⚠︎ | 36.02µs | 87.97µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 208.61µs | -24.1% | +29.7% ⚠︎ | 141.91µs | 348.01µs | 31 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 128 parts, distinct providers (stress) | 58.75µs | -28.9% |  | 35.87µs | 142.03µs | 17 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 16 parts, one repeated provider | 30.69µs | -31.0% |  | 17.71µs | 85.03µs | 17 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 2 parts, one repeated provider | 31.68µs | -25.4% |  | 16.08µs | 86.10µs | 17 |
| ai-sdk-system-metadata › ai-sdk: system-message metadata conversion through the runtime › 512 parts, distinct providers (stress) | 200.26µs | -22.1% |  | 123.04µs | 348.12µs | 17 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 47.19µs | -11.7% | +29.0% ⚠︎ | 30.81µs | 76.80µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 478.02µs | -9.7% | +41.3% ⚠︎ | 302.25µs | 724.04µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 6.51µs | -15.2% | +34.3% ⚠︎ | 3.81µs | 10.47µs | 31 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 51.86µs | -17.5% | +37.3% ⚠︎ | 32.88µs | 86.47µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 446.71µs | -24.3% | +43.4% ⚠︎ | 285.01µs | 775.76µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.741ms | -26.4% | +44.2% ⚠︎ | 2.538ms | 6.123ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 14.465ms | -27.5% | +41.2% ⚠︎ | 9.923ms | 24.407ms | 31 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 100 parts | 2.586ms |  |  | 2.086ms | 2.753ms | 4 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 2000 parts | 63.349ms |  |  | 62.415ms | 72.449ms | 4 |
| data-stream › assistant-stream: data stream decode + accumulate, one tool-call start per part › 500 parts | 12.078ms |  |  | 12.031ms | 12.885ms | 4 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 209.09µs | -27.9% | +27.7% ⚠︎ | 141.46µs | 366.16µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.001ms | -29.4% | +32.3% ⚠︎ | 1.346ms | 3.549ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.067ms | -27.1% | +38.7% ⚠︎ | 5.326ms | 14.192ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 176.20µs | -18.5% |  | 102.57µs | 292.71µs | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 1.910ms | +22.7% |  | 642.90µs | 2.447ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 42.81µs | -15.2% | +39.0% ⚠︎ | 26.72µs | 71.30µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 426.80µs | -16.4% | +34.7% ⚠︎ | 278.66µs | 715.19µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 2.328ms | -14.1% | +32.6% ⚠︎ | 1.497ms | 3.860ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 53.36µs | -10.4% | +37.3% ⚠︎ | 29.73µs | 82.07µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 542.30µs | -10.3% | +33.9% ⚠︎ | 302.89µs | 833.08µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.872ms | -9.7% | +30.9% ⚠︎ | 1.603ms | 4.389ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 27.81µs | -10.4% | +17.0% ⚠︎ | 16.04µs | 42.88µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 262.44µs | -11.8% | +14.9% ⚠︎ | 158.01µs | 423.12µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.430ms | -9.7% | +8.5% | 851.76µs | 2.231ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.18µs | -16.7% | +61.8% ⚠︎ | 0.10µs | 0.28µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.32µs | -14.5% | +59.4% ⚠︎ | 0.19µs | 0.47µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.59µs | -24.3% | +43.9% ⚠︎ | 1.09µs | 2.55µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.38µs | -22.1% | +18.4% ⚠︎ | 0.27µs | 0.68µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.35µs | -7.1% | +11.9% ⚠︎ | 1.36µs | 3.51µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.87µs | -14.9% | +3.7% | 12.04µs | 31.89µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 113.25µs | -0.6% | +34.5% ⚠︎ | 59.12µs | 148.42µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 656.34µs | +12.2% | +18.1% ⚠︎ | 346.91µs | 903.49µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.979ms | -7.3% | +19.9% ⚠︎ | 1.133ms | 2.839ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 119.00µs | -26.0% | +25.8% ⚠︎ | 79.43µs | 208.98µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.568ms | -3.2% | +34.6% ⚠︎ | 1.434ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 350.40µs | -10.3% | +48.4% ⚠︎ | 211.20µs | 516.21µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 518.73µs | +2.5% | +48.6% ⚠︎ | 288.59µs | 738.31µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 5.799ms | -5.2% | +38.3% ⚠︎ | 3.037ms | 8.120ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 484.63µs | -36.3% | +18.0% ⚠︎ | 319.30µs | 941.46µs | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 14.647ms | -10.6% | +30.9% ⚠︎ | 8.393ms | 25.457ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 2.358ms | -14.6% | +44.1% ⚠︎ | 1.456ms | 3.902ms | 31 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.812ms | -5.8% | +52.8% ⚠︎ | 1.041ms | 2.860ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.991ms | -15.2% | +76.9% ⚠︎ | 1.023ms | 3.532ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 2.204ms | -11.5% | +44.6% ⚠︎ | 1.335ms | 3.813ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 13.320ms | -21.7% | +80.8% ⚠︎ | 7.343ms | 22.986ms | 31 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 14.715ms | -18.9% | +65.4% ⚠︎ | 8.611ms | 24.553ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 1.150ms | +13.0% | +66.9% ⚠︎ | 440.23µs | 1.659ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.935ms | -10.4% | +65.1% ⚠︎ | 1.023ms | 3.633ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 6.534ms | -13.2% | +44.2% ⚠︎ | 4.065ms | 11.468ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.349ms | -0.5% | +18.4% ⚠︎ | 1.109ms | 1.509ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.443ms | +3.7% | +27.3% ⚠︎ | 1.027ms | 2.021ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.711ms | -12.6% | +66.6% ⚠︎ | 2.219ms | 4.952ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 204.94µs | -20.1% | +81.4% ⚠︎ | 112.80µs | 364.98µs | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.701ms | -22.2% | +59.7% ⚠︎ | 1.060ms | 2.948ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 183.740ms | -13.8% | +27.8% ⚠︎ | 115.601ms | 312.212ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 8.341ms | -22.2% | +51.4% ⚠︎ | 5.344ms | 13.429ms | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.23µs | -33.3% | +7.0% | 0.99µs | 2.38µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.58µs | -41.2% | -8.9% | 4.82µs | 10.92µs | 31 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 26.28µs | -29.7% | +1.9% | 14.86µs | 48.41µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 4.71µs | -31.2% | +44.3% ⚠︎ | 2.57µs | 7.33µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 15.62µs | -20.6% | +20.6% ⚠︎ | 10.50µs | 23.76µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 45.92µs | -28.2% | +53.3% ⚠︎ | 24.38µs | 72.69µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 183.32µs | -27.1% | -39.2% ⚠︎ | 138.29µs | 320.89µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 4.410ms | -6.6% | +75.4% ⚠︎ | 1.854ms | 8.611ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 24.807ms | -23.0% | +57.6% ⚠︎ | 13.632ms | 56.308ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 313.734ms | -20.6% | +57.9% ⚠︎ | 181.587ms | 561.414ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 377.24µs | -28.4% | +42.9% ⚠︎ | 183.67µs | 673.14µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 706.43µs | -7.6% | +57.0% ⚠︎ | 314.68µs | 1.039ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 3.416ms | +1.7% | +88.0% ⚠︎ | 1.423ms | 5.904ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 403.30µs | -27.6% | +56.3% ⚠︎ | 177.60µs | 675.28µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 1.137ms | +1.0% | +68.2% ⚠︎ | 525.40µs | 1.857ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 7.709ms | -38.7% | +21.8% ⚠︎ | 4.572ms | 20.626ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 331.87µs | -29.7% | +33.9% ⚠︎ | 165.84µs | 710.78µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 884.72µs | +0.7% | +77.7% ⚠︎ | 365.89µs | 1.290ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 5.606ms | -44.7% | +41.8% ⚠︎ | 2.541ms | 15.089ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 163.84µs | -39.6% | +27.7% ⚠︎ | 81.54µs | 344.03µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 375.11µs | -21.3% | +54.8% ⚠︎ | 173.27µs | 582.62µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 2.396ms | -17.2% | +61.9% ⚠︎ | 1.158ms | 5.662ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 10.79µs | -16.2% | +38.2% ⚠︎ | 6.31µs | 25.21µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 22.64µs | -14.8% | +16.9% ⚠︎ | 14.38µs | 42.13µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 201.76µs | -1.6% | +30.1% ⚠︎ | 101.89µs | 285.86µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 410.19µs | -9.4% | +53.3% ⚠︎ | 172.05µs | 760.55µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 908.16µs | +2.1% | +81.2% ⚠︎ | 366.31µs | 1.256ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 5.998ms | -13.8% | +53.1% ⚠︎ | 2.728ms | 15.054ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 154.15µs | -23.4% | +27.8% ⚠︎ | 108.91µs | 270.08µs | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.418ms | -21.9% | +27.5% ⚠︎ | 999.64µs | 2.346ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 709.16µs | -22.3% | +28.2% ⚠︎ | 503.83µs | 1.188ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 174.92µs | -28.4% | +27.3% ⚠︎ | 125.86µs | 325.02µs | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.525ms | -28.9% | +25.9% ⚠︎ | 1.144ms | 2.704ms | 31 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 779.38µs | -28.7% | +26.7% ⚠︎ | 581.91µs | 1.371ms | 31 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 246.60µs | -7.8% | +38.2% ⚠︎ | 136.11µs | 356.77µs | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 16.622ms | -21.0% | +29.6% ⚠︎ | 10.932ms | 28.310ms | 31 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 657.962ms | +37.7% | +3.1% | 290.173ms | 810.218ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 128.43µs | -32.7% | +25.7% ⚠︎ | 93.28µs | 243.98µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.048ms | -33.2% | +21.3% ⚠︎ | 786.61µs | 1.901ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 538.24µs | -33.0% | +22.6% ⚠︎ | 391.90µs | 980.16µs | 31 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 10000 bytes | 150.04µs | -8.1% |  | 98.43µs | 215.84µs | 13 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › accumulator: 50000 bytes | 690.03µs | -9.7% |  | 457.68µs | 1.006ms | 13 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 10000 bytes | 158.28µs | -12.3% |  | 108.43µs | 237.00µs | 13 |
| tool-args › assistant-stream: long string arguments (4096-char deltas) › active-reader: 50000 bytes | 723.98µs | -9.6% |  | 481.00µs | 1.038ms | 13 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 2.556ms | -5.2% | +58.2% ⚠︎ | 1.509ms | 4.032ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 2.625ms | -3.6% | +62.7% ⚠︎ | 1.513ms | 3.823ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 2.547ms | -4.4% | +60.7% ⚠︎ | 1.464ms | 3.908ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 2.167ms | -18.3% | +48.0% ⚠︎ | 1.368ms | 4.087ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.680ms | +0.3% | +69.3% ⚠︎ | 826.58µs | 2.503ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 2.249ms | -11.1% | +64.1% ⚠︎ | 1.309ms | 3.535ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 2.247ms | -11.2% | +67.6% ⚠︎ | 1.307ms | 3.549ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 222.25µs | +6.6% | +98.0% ⚠︎ | 110.17µs | 301.50µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 95.68µs | -12.8% | +54.7% ⚠︎ | 61.85µs | 153.96µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 1.148ms | -11.9% | +61.9% ⚠︎ | 689.25µs | 1.901ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 1.242ms | -12.9% | +46.6% ⚠︎ | 712.81µs | 2.155ms | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 1.312ms | -11.3% | +48.1% ⚠︎ | 715.83µs | 2.307ms | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 30.16µs | -19.8% | +40.3% ⚠︎ | 20.86µs | 55.97µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 33.28µs | -16.3% | +51.3% ⚠︎ | 21.22µs | 56.01µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 50.54µs | -6.7% | +45.0% ⚠︎ | 32.06µs | 75.53µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 960.07µs | -16.5% | +46.4% ⚠︎ | 587.81µs | 1.717ms | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
