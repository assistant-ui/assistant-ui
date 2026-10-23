## aui-perf nightly record

_51 points · 2026-09-03T05:27:14.273Z to 2026-10-23T04:38:43.367Z · latest runner: AMD EPYC · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 546.70µs | +3.3% | -13.8% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 646.49µs | -0.9% | -11.0% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 31.72µs | +1.9% | -13.0% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 364.72µs | +2.0% | -10.5% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.618ms | +0.8% | -10.9% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 152.12µs | +2.3% | -10.0% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.374ms | -0.5% | -12.5% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.537ms | +0.1% | -12.0% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.70µs | +0.3% | -20.7% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 45.33µs | -1.1% | -18.7% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 180.54µs | +1.7% | -18.7% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 46.67µs | +6.8% |  | 34.14µs | 46.67µs | 18 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 402.84µs | +0.0% |  | 328.87µs | 414.32µs | 18 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.62µs | +2.3% |  | 4.27µs | 5.62µs | 18 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 48.58µs | +10.6% |  | 35.19µs | 48.58µs | 18 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 379.29µs | -1.6% | -33.0% ⚠︎ | 311.48µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.298ms | -1.7% | -35.6% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 13.113ms | -2.3% | -35.4% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 231.49µs | +1.7% | -34.9% ⚠︎ | 163.70µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.175ms | +5.0% | -36.9% ⚠︎ | 1.512ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 8.905ms | +11.0% | -35.7% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 128.89µs |  |  | 128.89µs | 128.89µs | 1 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 762.79µs |  |  | 762.79µs | 762.79µs | 1 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 32.14µs | +0.8% | +23.4% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 356.14µs | +0.6% | +25.8% ⚠︎ | 256.80µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.933ms | -0.8% | +29.3% ⚠︎ | 1.400ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 38.59µs | +1.8% | +12.4% ⚠︎ | 32.24µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 397.48µs | +3.9% | +14.7% ⚠︎ | 330.50µs | 404.95µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.170ms | +2.8% | +14.1% ⚠︎ | 1.792ms | 2.193ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 23.36µs | +3.5% | +17.3% ⚠︎ | 18.88µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 227.97µs | +3.2% | +17.0% ⚠︎ | 185.12µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.219ms | -2.4% | +10.9% ⚠︎ | 1.038ms | 1.317ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | -2.1% | +13.2% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.22µs | -3.0% | +17.6% ⚠︎ | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.36µs | +1.0% | +17.0% ⚠︎ | 1.10µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.41µs | +4.4% | +20.2% ⚠︎ | 0.32µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.10µs | +7.4% | +19.0% ⚠︎ | 1.65µs | 2.14µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.09µs | +10.3% | +27.5% ⚠︎ | 14.82µs | 19.98µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 92.09µs | +3.3% | +22.9% ⚠︎ | 72.89µs | 92.09µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 594.28µs | +4.9% | +17.8% ⚠︎ | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.317ms | +2.0% |  | 1.133ms | 1.774ms | 12 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 116.79µs | +0.5% |  | 94.56µs | 118.57µs | 11 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.659ms | +1.7% |  | 1.450ms | 2.024ms | 12 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 241.40µs | -1.9% |  | 216.72µs | 246.18µs | 12 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 365.11µs | +0.7% |  | 295.45µs | 373.70µs | 12 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.535ms | +7.7% |  | 2.767ms | 4.523ms | 12 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 542.42µs | +2.5% |  | 410.62µs | 542.42µs | 11 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.819ms | -1.6% |  | 9.408ms | 12.361ms | 12 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.722ms | +0.0% |  | 1.500ms | 1.748ms | 12 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.296ms | +2.9% |  | 1.048ms | 1.303ms | 12 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.196ms | +1.9% |  | 1.018ms | 1.222ms | 17 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.483ms | +0.8% |  | 1.371ms | 1.548ms | 17 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.529ms | +2.6% |  | 7.336ms | 8.816ms | 17 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.867ms | +2.0% |  | 8.670ms | 10.017ms | 17 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 787.07µs | +9.5% | +92.9% ⚠︎ | 371.23µs | 787.07µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.210ms | -1.0% | +5.7% | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.942ms | -1.2% | +14.9% ⚠︎ | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.120ms | +0.3% | -2.3% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.131ms | -2.5% | +2.3% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.219ms | -11.9% | -21.1% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 161.14µs | +15.2% |  | 100.23µs | 161.14µs | 18 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.503ms | +16.3% |  | 944.27µs | 1.503ms | 18 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 168.495ms | +0.2% |  | 115.889ms | 170.961ms | 18 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 7.499ms | +13.6% |  | 4.707ms | 7.499ms | 18 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.18µs | -0.7% |  | 0.99µs | 1.19µs | 18 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.48µs | -1.2% |  | 5.26µs | 6.41µs | 18 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 17.91µs | +2.7% |  | 15.93µs | 29.41µs | 18 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.01µs | +0.6% | +9.1% | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.71µs | +1.0% | +5.7% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 28.62µs | +1.7% | +7.5% | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 267.76µs | +5.8% | +11.7% ⚠︎ | 223.12µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.989ms | +3.5% | +63.1% ⚠︎ | 1.662ms | 2.989ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 18.409ms | +1.2% | +32.0% ⚠︎ | 11.705ms | 18.409ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 289.244ms | +0.3% | +36.3% ⚠︎ | 159.336ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 246.64µs | +1.7% |  | 197.56µs | 268.00µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 396.46µs | +1.8% |  | 327.73µs | 473.00µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.135ms | +0.6% |  | 1.495ms | 2.207ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 231.87µs | +0.5% |  | 185.62µs | 283.34µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 671.86µs | -8.0% |  | 526.75µs | 976.95µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.887ms | +6.9% |  | 4.475ms | 12.620ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 223.67µs | +3.7% |  | 171.55µs | 267.92µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 506.28µs | +2.1% |  | 371.58µs | 830.44µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.344ms | -13.5% |  | 2.630ms | 10.511ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 110.74µs | -7.6% |  | 83.88µs | 128.35µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 233.72µs | +3.1% |  | 184.69µs | 261.67µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.534ms | -12.2% |  | 1.226ms | 1.890ms | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.56µs | -0.8% |  | 6.55µs | 8.68µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 20.91µs | +1.5% |  | 14.21µs | 20.91µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 164.46µs | -6.3% |  | 102.78µs | 175.47µs | 22 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 218.27µs | -8.3% | +15.9% ⚠︎ | 174.68µs | 267.49µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 500.13µs | -0.9% | -18.7% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.350ms | -7.9% | -50.7% ⚠︎ | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 135.63µs | -0.5% |  | 113.03µs | 165.76µs | 17 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.232ms | -0.7% |  | 1.028ms | 1.471ms | 17 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 617.14µs | -1.0% |  | 519.49µs | 745.85µs | 17 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 166.17µs | -1.3% |  | 137.46µs | 273.39µs | 17 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.462ms | -2.2% |  | 1.212ms | 2.357ms | 17 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 739.95µs | -2.1% |  | 615.35µs | 1.202ms | 17 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 161.51µs | -0.4% |  | 135.97µs | 188.74µs | 17 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.182ms | -2.5% |  | 11.650ms | 14.005ms | 17 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 359.455ms | +1.6% |  | 304.987ms | 638.209ms | 17 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 134.96µs | -2.6% | -35.8% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.088ms | -3.7% | -39.5% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 563.64µs | -4.2% | -39.3% ⚠︎ | 438.95µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.809ms | +6.5% | +1.9% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.795ms | +5.6% | -4.0% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.740ms | +4.8% | -0.8% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.687ms | +0.1% | +10.1% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.045ms | -0.3% | +4.8% | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.629ms | +0.8% | +6.0% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.533ms | -5.9% | -0.7% | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 133.67µs | +0.7% | -30.3% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 73.69µs | +1.3% | +12.8% ⚠︎ | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 855.70µs | +0.1% | +5.9% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 857.86µs | -1.4% | +12.2% ⚠︎ | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 897.16µs | +1.8% | +18.2% ⚠︎ | 706.37µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 24.82µs | -0.5% | -35.7% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 26.30µs | +3.5% | -96.1% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 37.26µs | -0.9% | +4.8% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 712.87µs | +2.4% | +10.2% ⚠︎ | 599.35µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
