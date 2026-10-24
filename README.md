## aui-perf nightly record

_52 points · 2026-09-03T05:27:14.273Z to 2026-10-24T04:36:36.644Z · latest runner: AMD EPYC · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 493.05µs | -1.3% | -26.5% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 577.26µs | -1.3% | -24.1% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 26.58µs | -3.1% | -32.6% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 308.91µs | -6.1% | -28.3% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.822ms | -4.9% | -29.0% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 127.70µs | -7.1% | -30.0% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.196ms | -6.0% | -29.6% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.753ms | -6.7% | -29.3% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.13µs | -2.7% | -31.4% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 42.35µs | +1.9% | -29.1% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 167.53µs | +3.1% | -31.2% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 37.55µs | +0.5% |  | 34.14µs | 46.67µs | 19 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 344.13µs | -7.3% |  | 328.87µs | 414.32µs | 19 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.50µs | -5.2% |  | 4.27µs | 5.62µs | 19 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 38.52µs | -6.8% |  | 35.19µs | 48.58µs | 19 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 331.13µs | -4.9% | -44.3% ⚠︎ | 311.48µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.890ms | -5.3% | -46.3% ⚠︎ | 2.594ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.385ms | -5.4% | -46.6% ⚠︎ | 10.242ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 183.61µs | -12.0% | -52.1% ⚠︎ | 163.70µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.706ms | -8.4% | -54.2% ⚠︎ | 1.512ms | 3.666ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.814ms | -10.9% | -53.9% ⚠︎ | 5.816ms | 15.002ms | 31 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 116.64µs |  |  | 116.64µs | 128.89µs | 2 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 798.93µs |  |  | 762.79µs | 798.93µs | 2 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.74µs | -0.3% | +8.5% | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 328.01µs | -1.5% | +11.7% ⚠︎ | 256.80µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.741ms | -4.3% | +12.8% ⚠︎ | 1.400ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 35.53µs | +2.5% | -1.4% | 32.24µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 361.32µs | +0.5% | -0.1% | 330.50µs | 404.95µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.969ms | +1.0% | -1.8% | 1.792ms | 2.193ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.55µs | -0.8% | +0.6% | 18.88µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 213.31µs | +4.6% | +3.9% | 185.12µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.165ms | +1.4% | +0.4% | 1.038ms | 1.317ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -2.5% | -3.1% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -1.8% | +5.1% | 0.19µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.24µs | -2.2% | +4.4% | 1.10µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | +0.1% | +3.7% | 0.32µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.90µs | +3.8% | +5.5% | 1.65µs | 2.14µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 17.34µs | +7.3% | +10.1% ⚠︎ | 14.82µs | 19.98µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 75.38µs | +3.1% | -13.1% ⚠︎ | 72.89µs | 92.09µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 474.67µs | +4.8% | -20.4% ⚠︎ | 447.91µs | 595.73µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.334ms | +12.6% |  | 1.133ms | 1.774ms | 13 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 104.30µs | -0.7% |  | 94.56µs | 118.57µs | 12 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.536ms | +3.0% |  | 1.450ms | 2.024ms | 13 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 228.53µs | +2.0% |  | 216.72µs | 246.18µs | 13 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 321.80µs | -3.2% |  | 295.45µs | 373.70µs | 13 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.263ms | +8.8% |  | 2.767ms | 4.523ms | 13 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 485.85µs | -1.3% |  | 410.62µs | 542.42µs | 12 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.795ms | -3.2% |  | 9.408ms | 12.361ms | 13 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.595ms | +1.5% |  | 1.500ms | 1.748ms | 13 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.135ms | -3.6% |  | 1.048ms | 1.303ms | 13 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.072ms | -2.3% |  | 1.018ms | 1.222ms | 18 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.385ms | -3.6% |  | 1.371ms | 1.548ms | 18 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.861ms | +0.8% |  | 7.336ms | 8.816ms | 18 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.107ms | +0.1% |  | 8.670ms | 10.017ms | 18 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 576.55µs | -5.1% | +30.8% ⚠︎ | 371.23µs | 787.07µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.080ms | -5.6% | -9.7% | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.318ms | -4.2% | -5.1% | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.132ms | -0.6% | +1.5% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.073ms | -0.4% | -3.5% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.630ms | +9.7% | -11.1% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 129.55µs | -3.6% |  | 100.23µs | 161.14µs | 19 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.222ms | -0.3% |  | 944.27µs | 1.503ms | 19 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 139.413ms | -7.8% |  | 115.889ms | 170.961ms | 19 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.067ms | -2.4% |  | 4.707ms | 7.499ms | 19 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.05µs | -6.7% |  | 0.99µs | 1.19µs | 19 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.74µs | +9.3% |  | 5.26µs | 6.41µs | 19 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 20.10µs | +25.1% |  | 15.93µs | 29.41µs | 19 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.71µs | -2.8% | -5.3% | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.37µs | +0.9% | +1.5% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 25.77µs | -2.7% | -7.9% | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 244.21µs | +0.3% | -3.0% | 223.12µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.299ms | -10.7% | +14.2% ⚠︎ | 1.662ms | 2.989ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.732ms | +0.1% | +3.4% | 11.705ms | 18.409ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 234.878ms | -10.9% | +2.0% | 159.336ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 197.12µs | -6.2% |  | 197.12µs | 268.00µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 329.22µs | -12.8% |  | 327.73µs | 473.00µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.701ms | -3.8% |  | 1.495ms | 2.207ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 198.48µs | -6.1% |  | 185.62µs | 283.34µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 632.12µs | -3.3% |  | 526.75µs | 976.95µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.697ms | -1.4% |  | 4.475ms | 12.620ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 202.97µs | +6.3% |  | 171.55µs | 267.92µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 436.39µs | +7.0% |  | 371.58µs | 830.44µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.922ms | -19.2% |  | 2.630ms | 10.511ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 95.43µs | -11.3% |  | 83.88µs | 128.35µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 201.13µs | -5.8% |  | 184.69µs | 261.67µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.425ms | -2.9% |  | 1.226ms | 1.890ms | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.20µs | -10.9% |  | 6.55µs | 8.68µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 18.14µs | -2.6% |  | 14.21µs | 20.91µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 146.30µs | +0.2% |  | 102.78µs | 175.47µs | 23 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 176.71µs | -13.9% | -14.1% ⚠︎ | 174.68µs | 267.49µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 399.74µs | +3.8% | -35.8% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.171ms | +5.8% | -55.4% ⚠︎ | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 118.49µs | -5.8% |  | 113.03µs | 165.76µs | 18 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.088ms | -4.5% |  | 1.028ms | 1.471ms | 18 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 542.50µs | -6.2% |  | 519.49µs | 745.85µs | 18 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 145.43µs | -5.1% |  | 137.46µs | 273.39µs | 18 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.294ms | -3.9% |  | 1.212ms | 2.357ms | 18 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 657.94µs | -4.3% |  | 615.35µs | 1.202ms | 18 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 144.07µs | -2.8% |  | 135.97µs | 188.74µs | 18 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.327ms | +2.9% |  | 11.650ms | 14.005ms | 18 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 337.349ms | +7.4% |  | 304.987ms | 638.209ms | 18 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 115.01µs | -8.7% | -47.7% ⚠︎ | 102.17µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 978.76µs | -4.6% | -48.1% ⚠︎ | 864.16µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 497.45µs | -6.5% | -48.4% ⚠︎ | 438.95µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.612ms | -2.1% | -23.3% ⚠︎ | 1.470ms | 1.809ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.627ms | -6.1% | -19.5% ⚠︎ | 1.488ms | 1.804ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.520ms | -4.3% | -22.9% ⚠︎ | 1.414ms | 1.753ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.442ms | -6.5% | -12.7% ⚠︎ | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 880.68µs | -11.2% | -19.3% ⚠︎ | 860.59µs | 1.048ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.406ms | -3.7% | -15.4% ⚠︎ | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.416ms | -3.1% | -11.9% ⚠︎ | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 119.86µs | -2.4% | -38.9% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.89µs | -3.7% | -9.2% | 60.96µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 735.73µs | -2.3% | -12.1% ⚠︎ | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 754.36µs | -3.3% | -9.6% | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 765.80µs | -4.5% | -6.9% | 706.37µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.05µs | -4.3% | -42.1% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.29µs | -3.7% | -96.6% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.25µs | -6.5% | -6.8% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 632.81µs | -7.7% | -7.8% | 599.35µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
