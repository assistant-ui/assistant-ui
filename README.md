## aui-perf nightly record

_41 points · 2026-09-03T05:27:14.273Z to 2026-10-13T04:46:08.805Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 629.89µs | +0.7% | +6.4% | 592.35µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 710.25µs | +1.1% | +5.4% | 665.78µs | 804.46µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 34.91µs | +2.2% | +4.8% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 386.51µs | +1.3% | +3.0% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 6.060ms | +2.1% | +3.8% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.82µs | -5.3% | +1.9% | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.439ms | -5.4% | -1.0% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.757ms | -5.5% | -0.4% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.76µs | -0.4% | +3.1% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 54.73µs | -1.1% | +3.8% | 52.83µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 215.19µs | -1.4% | +3.6% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 35.37µs | +2.7% |  | 34.14µs | 40.61µs | 8 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 346.06µs | +5.2% |  | 328.87µs | 398.81µs | 8 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.63µs | +8.4% |  | 4.27µs | 5.09µs | 8 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 38.64µs | +9.5% |  | 35.19µs | 40.83µs | 8 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 536.61µs | +3.5% | +10.2% ⚠︎ | 491.12µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.803ms | +1.9% | +7.5% | 4.486ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 19.164ms | +3.0% | +8.0% | 17.736ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 332.64µs | +1.4% | +4.4% | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.092ms | +0.6% | +3.5% | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.518ms | +1.3% | +3.8% | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.05µs | +13.7% | +17.7% ⚠︎ | 23.95µs | 28.91µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 311.00µs | +17.7% | +20.3% ⚠︎ | 249.56µs | 330.30µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.661ms | +17.3% | +20.0% ⚠︎ | 1.385ms | 1.740ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 33.65µs | +0.7% | +21.7% ⚠︎ | 27.25µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 342.54µs | +0.1% | +22.2% ⚠︎ | 274.56µs | 404.10µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.833ms | -1.5% | +20.9% ⚠︎ | 1.516ms | 2.169ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.28µs | -0.6% | +13.1% ⚠︎ | 18.01µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 198.80µs | +0.7% | +13.7% ⚠︎ | 174.51µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.076ms | -0.9% | +10.3% ⚠︎ | 983.29µs | 1.304ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -0.2% | +4.9% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +2.8% | +14.2% ⚠︎ | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.20µs | +0.3% | +14.8% ⚠︎ | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | -0.8% | +8.7% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.74µs | -1.5% | +5.8% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.54µs | -1.9% | +6.9% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.00µs | -1.8% | +2.5% | 70.58µs | 86.70µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 479.46µs | +0.6% | +1.3% | 447.91µs | 596.48µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.152ms |  |  | 1.152ms | 1.495ms | 2 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 98.22µs |  |  | 98.22µs | 98.22µs | 1 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.473ms |  |  | 1.450ms | 1.473ms | 2 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 216.72µs |  |  | 216.72µs | 221.93µs | 2 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 319.17µs |  |  | 295.45µs | 319.17µs | 2 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.030ms |  |  | 3.030ms | 3.257ms | 2 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 464.11µs |  |  | 464.11µs | 464.11µs | 1 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.408ms |  |  | 9.408ms | 9.665ms | 2 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.534ms |  |  | 1.534ms | 1.541ms | 2 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.134ms |  |  | 1.048ms | 1.134ms | 2 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.048ms |  |  | 1.018ms | 1.222ms | 7 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.443ms |  |  | 1.371ms | 1.499ms | 7 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.466ms |  |  | 7.336ms | 8.816ms | 7 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.741ms |  |  | 8.670ms | 10.017ms | 7 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 618.25µs | +18.1% | +53.5% ⚠︎ | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.089ms | +3.6% | +2.6% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.339ms | -0.2% | +8.1% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.129ms | -0.2% | -0.2% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.071ms | +1.8% | +1.1% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.624ms | -2.9% | -3.8% | 2.210ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 120.84µs | +20.6% |  | 100.23µs | 152.70µs | 8 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.100ms | +16.5% |  | 944.27µs | 1.368ms | 8 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 145.437ms | +25.5% |  | 115.889ms | 167.624ms | 8 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.406ms | +14.8% |  | 4.707ms | 6.895ms | 8 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.04µs | +3.1% |  | 0.99µs | 1.19µs | 8 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.13µs | +6.0% |  | 5.62µs | 6.13µs | 8 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 22.77µs | +11.6% |  | 17.45µs | 22.77µs | 8 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.64µs | +1.0% | +3.6% | 2.51µs | 3.21µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.74µs | +16.9% | +2.5% | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.31µs | -0.3% | -2.4% | 24.32µs | 30.73µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 248.79µs | +5.3% | +20.7% ⚠︎ | 216.15µs | 287.79µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.228ms | +15.8% | +40.8% ⚠︎ | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.228ms | +20.9% | +29.4% ⚠︎ | 11.705ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 235.169ms | +32.5% | +35.3% ⚠︎ | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 204.50µs | -0.4% |  | 197.56µs | 268.00µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 356.21µs | -2.8% |  | 327.73µs | 473.00µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.655ms | +8.2% |  | 1.495ms | 2.207ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 215.07µs | -1.2% |  | 187.05µs | 283.34µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 629.90µs | -26.1% |  | 528.14µs | 976.95µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.454ms | -45.1% |  | 4.475ms | 12.620ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 193.20µs | +1.3% |  | 171.55µs | 267.92µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 371.58µs | -41.1% |  | 371.58µs | 830.44µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.317ms | -52.3% |  | 2.630ms | 10.511ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 95.45µs | -3.9% |  | 83.88µs | 111.41µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 201.38µs | -0.1% |  | 184.69µs | 235.11µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.363ms | +3.8% |  | 1.226ms | 1.624ms | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.99µs | +5.1% |  | 6.55µs | 7.89µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.87µs | +2.3% |  | 14.21µs | 17.62µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 106.75µs | -0.9% |  | 102.78µs | 128.33µs | 12 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 183.07µs | -8.3% | -35.5% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 387.16µs | -25.4% | -75.9% ⚠︎ | 374.00µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.859ms | -56.9% | -94.2% ⚠︎ | 2.568ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 140.34µs |  |  | 134.67µs | 165.76µs | 7 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.270ms |  |  | 1.226ms | 1.471ms | 7 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 649.49µs |  |  | 613.38µs | 745.85µs | 7 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 236.27µs |  |  | 223.89µs | 273.39µs | 7 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 2.058ms |  |  | 1.949ms | 2.357ms | 7 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 1.044ms |  |  | 986.53µs | 1.202ms | 7 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 143.49µs |  |  | 140.93µs | 166.92µs | 7 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.328ms |  |  | 12.360ms | 14.005ms | 7 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 327.129ms |  |  | 307.789ms | 360.804ms | 7 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 211.13µs | +4.9% | +5.6% | 178.72µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.770ms | +7.4% | +3.3% | 1.531ms | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 894.98µs | +4.4% | +4.0% | 782.04µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.496ms | +1.1% | -8.8% | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.491ms | -0.1% | -6.0% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.433ms | -0.8% | -7.1% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.437ms | +3.2% | +1.2% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 887.87µs | +2.1% | -1.5% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.405ms | +1.7% | -2.2% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.366ms | -2.3% | -4.8% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 124.47µs | +11.6% | -31.2% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.32µs | -0.3% | +2.4% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 720.16µs | +0.5% | -5.0% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 741.74µs | +2.1% | +5.8% | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 751.71µs | +0.3% | +8.5% | 693.81µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.70µs | -37.1% | -39.3% ⚠︎ | 20.95µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.98µs | -96.4% | -96.5% ⚠︎ | 21.26µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.38µs | +7.1% | +1.6% | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 644.53µs | +5.3% | +8.4% | 596.12µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
