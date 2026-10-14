## aui-perf nightly record

_42 points · 2026-09-03T05:27:14.273Z to 2026-10-14T04:39:22.761Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 693.65µs | +10.9% | +17.2% ⚠︎ | 592.35µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 808.41µs | +15.1% | +20.0% ⚠︎ | 665.78µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 40.75µs | +19.3% | +22.3% ⚠︎ | 32.52µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 443.39µs | +16.2% | +18.1% ⚠︎ | 359.60µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.892ms | +16.1% | +18.0% ⚠︎ | 5.607ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 190.46µs | +14.3% | +23.0% ⚠︎ | 152.78µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.714ms | +12.7% | +17.9% ⚠︎ | 1.375ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 6.879ms | +12.9% | +19.0% ⚠︎ | 5.570ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 7.80µs | +14.9% | +19.0% ⚠︎ | 6.52µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 61.59µs | +11.3% | +16.8% ⚠︎ | 52.83µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 245.47µs | +12.4% | +18.2% ⚠︎ | 201.64µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 44.86µs | +30.3% |  | 34.14µs | 44.86µs | 9 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 414.32µs | +26.0% |  | 328.87µs | 414.32µs | 9 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.46µs | +27.9% |  | 4.27µs | 5.46µs | 9 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 45.55µs | +29.0% |  | 35.19µs | 45.55µs | 9 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 621.95µs | +19.9% | +27.7% ⚠︎ | 491.12µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 5.522ms | +17.2% | +23.5% ⚠︎ | 4.486ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 22.539ms | +21.2% | +27.0% ⚠︎ | 17.736ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 384.24µs | +17.1% | +20.6% ⚠︎ | 291.94µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.616ms | +17.6% | +21.1% ⚠︎ | 2.715ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 15.002ms | +21.4% | +24.4% ⚠︎ | 10.803ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 32.33µs | +31.0% | +35.6% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 364.42µs | +37.9% | +40.9% ⚠︎ | 249.56µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.971ms | +39.2% | +42.4% ⚠︎ | 1.385ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 38.81µs | +16.2% | +40.4% ⚠︎ | 27.25µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 395.69µs | +15.6% | +41.2% ⚠︎ | 274.56µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.179ms | +17.2% | +43.8% ⚠︎ | 1.516ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 22.85µs | +12.0% | +27.4% ⚠︎ | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 226.32µs | +14.6% | +29.5% ⚠︎ | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.282ms | +18.0% | +31.4% ⚠︎ | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +15.8% | +21.7% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.22µs | +11.1% | +23.5% ⚠︎ | 0.17µs | 0.22µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.37µs | +14.2% | +30.8% ⚠︎ | 0.99µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.41µs | +12.4% | +23.2% ⚠︎ | 0.30µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.02µs | +14.0% | +22.5% ⚠︎ | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.82µs | +12.5% | +22.6% ⚠︎ | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 89.54µs | +17.2% | +22.4% ⚠︎ | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 595.73µs | +25.1% | +25.9% ⚠︎ | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.412ms |  |  | 1.152ms | 1.495ms | 3 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 118.57µs |  |  | 98.22µs | 118.57µs | 2 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.686ms |  |  | 1.450ms | 1.686ms | 3 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 246.18µs |  |  | 216.72µs | 246.18µs | 3 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 369.60µs |  |  | 295.45µs | 369.60µs | 3 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.281ms |  |  | 3.030ms | 3.281ms | 3 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 519.00µs |  |  | 464.11µs | 519.00µs | 2 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 11.266ms |  |  | 9.408ms | 11.266ms | 3 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.748ms |  |  | 1.534ms | 1.748ms | 3 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.303ms |  |  | 1.048ms | 1.303ms | 3 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.199ms |  |  | 1.018ms | 1.222ms | 8 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.467ms |  |  | 1.371ms | 1.499ms | 8 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.560ms |  |  | 7.336ms | 8.816ms | 8 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.979ms |  |  | 8.670ms | 10.017ms | 8 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 723.56µs | +38.2% | +79.7% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.251ms | +19.0% | +17.8% ⚠︎ | 1.021ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 5.062ms | +16.4% | +26.1% ⚠︎ | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.115ms | -1.4% | -1.4% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.127ms | +7.1% | +6.4% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.583ms | -4.4% | -5.2% | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 151.85µs | +51.5% |  | 100.23µs | 152.70µs | 9 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.409ms | +49.2% |  | 944.27µs | 1.409ms | 9 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 170.961ms | +47.5% |  | 115.889ms | 170.961ms | 9 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.792ms | +44.3% |  | 4.707ms | 6.895ms | 9 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.18µs | +16.8% |  | 0.99µs | 1.19µs | 9 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.67µs | -1.9% |  | 5.62µs | 6.13µs | 9 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.15µs | -16.0% |  | 17.15µs | 22.77µs | 9 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.05µs | +16.6% | +19.5% ⚠︎ | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.72µs | +16.7% | +2.3% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 28.93µs | +14.0% | +11.6% ⚠︎ | 24.32µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 264.51µs | +12.0% | +28.3% ⚠︎ | 216.15µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.887ms | +50.0% | +82.4% ⚠︎ | 1.549ms | 2.887ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 17.585ms | +39.7% | +49.4% ⚠︎ | 11.705ms | 17.585ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 290.378ms | +63.6% | +67.1% ⚠︎ | 150.737ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 254.50µs | +23.9% |  | 197.56µs | 268.00µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 387.37µs | +5.7% |  | 327.73µs | 473.00µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.205ms | +44.1% |  | 1.495ms | 2.207ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 248.31µs | +14.0% |  | 187.05µs | 283.34µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 717.81µs | -15.8% |  | 528.14µs | 976.95µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.733ms | -32.3% |  | 4.475ms | 12.620ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 255.81µs | +34.1% |  | 171.55µs | 267.92µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 566.31µs | -10.2% |  | 371.58µs | 830.44µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.900ms | -43.9% |  | 2.630ms | 10.511ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 119.89µs | +20.7% |  | 83.88µs | 119.89µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 261.67µs | +29.8% |  | 184.69µs | 261.67µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.608ms | +22.5% |  | 1.226ms | 1.624ms | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.38µs | +26.0% |  | 6.55µs | 8.38µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 18.29µs | +25.9% |  | 14.21µs | 18.29µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 123.26µs | +14.4% |  | 102.78µs | 128.33µs | 13 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 246.23µs | +23.3% | -13.3% ⚠︎ | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 506.69µs | -2.4% | -68.4% ⚠︎ | 374.00µs | 1.779ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 4.357ms | -34.3% | -91.1% ⚠︎ | 2.568ms | 54.890ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 163.70µs |  |  | 134.67µs | 165.76µs | 8 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.467ms |  |  | 1.226ms | 1.471ms | 8 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 742.08µs |  |  | 613.38µs | 745.85µs | 8 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 269.07µs |  |  | 223.89µs | 273.39µs | 8 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.356ms |  |  | 1.949ms | 2.357ms | 8 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.190ms |  |  | 986.53µs | 1.202ms | 8 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 166.15µs |  |  | 140.93µs | 166.92µs | 8 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.383ms |  |  | 12.360ms | 14.005ms | 8 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 350.623ms |  |  | 307.789ms | 360.804ms | 8 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 234.82µs | +16.6% | +17.5% ⚠︎ | 178.72µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.982ms | +20.4% | +15.7% ⚠︎ | 1.531ms | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 1.025ms | +19.7% | +19.2% ⚠︎ | 782.04µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.778ms | +20.2% | +8.4% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.755ms | +17.6% | +10.7% ⚠︎ | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.666ms | +15.3% | +7.9% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.720ms | +23.5% | +21.1% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.015ms | +16.6% | +12.6% ⚠︎ | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.679ms | +21.6% | +16.9% ⚠︎ | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.605ms | +14.9% | +12.0% ⚠︎ | 1.330ms | 1.608ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 134.02µs | +20.1% | -25.9% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 74.62µs | +19.4% | +22.6% ⚠︎ | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 860.28µs | +20.1% | +13.4% ⚠︎ | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 905.34µs | +24.6% | +29.1% ⚠︎ | 689.02µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 946.43µs | +26.3% | +36.6% ⚠︎ | 693.81µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 25.33µs | -26.6% | -29.1% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 25.96µs | -95.7% | -95.8% ⚠︎ | 21.26µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.57µs | +17.1% | +11.0% ⚠︎ | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 738.84µs | +20.7% | +24.2% ⚠︎ | 596.12µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
