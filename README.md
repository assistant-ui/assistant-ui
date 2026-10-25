## aui-perf nightly record

_53 points · 2026-09-03T05:27:14.273Z to 2026-10-25T04:37:05.416Z · latest runner: AMD EPYC · Node v24.22.1_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 465.34µs | +0.2% | -23.6% ⚠︎ | 464.56µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 540.03µs | +0.2% | -22.0% ⚠︎ | 538.74µs | 808.41µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 24.88µs | -1.8% | -27.3% ⚠︎ | 24.88µs | 40.75µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 292.20µs | +0.1% | -21.6% ⚠︎ | 291.86µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.560ms | -0.2% | -22.2% ⚠︎ | 4.560ms | 6.892ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 120.80µs | -0.5% | -24.2% ⚠︎ | 120.80µs | 190.46µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.126ms | +0.1% | -23.3% ⚠︎ | 1.125ms | 1.714ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.501ms | +0.6% | -24.3% ⚠︎ | 4.477ms | 6.879ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.81µs | +0.4% | -27.8% ⚠︎ | 4.79µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 39.84µs | +1.7% | -24.9% ⚠︎ | 39.16µs | 61.59µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 156.69µs | +0.8% | -25.6% ⚠︎ | 155.39µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 33.46µs | -2.9% |  | 33.46µs | 46.67µs | 20 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 318.63µs | -3.9% |  | 318.63µs | 414.32µs | 20 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.23µs | -5.2% |  | 4.23µs | 5.62µs | 20 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 35.87µs | -4.9% |  | 35.19µs | 48.58µs | 20 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 309.68µs | -1.7% | -41.2% ⚠︎ | 309.68µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.720ms | -2.5% | -42.6% ⚠︎ | 2.594ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.789ms | -1.6% | -43.0% ⚠︎ | 10.242ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 176.44µs | -6.2% | -47.4% ⚠︎ | 163.70µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.608ms | -5.0% | -47.6% ⚠︎ | 1.512ms | 3.666ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.455ms | -6.7% | -47.6% ⚠︎ | 5.816ms | 15.002ms | 30 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 1000 messages, 6-part replies | 106.15µs |  |  | 106.15µs | 128.89µs | 3 |
| external-message-conversion › core: cached external message conversion, one streaming delta › 5000 messages, 20-part replies | 758.99µs |  |  | 758.99µs | 798.93µs | 3 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.43µs | -1.3% | +9.6% | 23.95µs | 32.33µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 303.96µs | -1.6% | +9.1% | 256.80µs | 364.42µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.637ms | -1.7% | +11.5% ⚠︎ | 1.400ms | 1.971ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 32.36µs | +0.4% | -1.5% | 32.24µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 331.62µs | -1.2% | -1.9% | 330.50µs | 404.95µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.807ms | -0.1% | +0.1% | 1.792ms | 2.193ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.30µs | +0.7% | -1.5% | 19.18µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 186.11µs | +0.5% | -2.4% | 185.12µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.029ms | -2.2% | -1.4% | 1.029ms | 1.317ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | -1.6% | -3.3% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | -3.9% | -1.8% | 0.19µs | 0.23µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.18µs | +1.7% | -2.7% | 1.10µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | -0.2% | +1.3% | 0.32µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.80µs | +5.7% | +5.3% | 1.65µs | 2.14µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.08µs | +6.2% | +5.3% | 14.82µs | 19.98µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 70.88µs | -2.8% | -8.0% | 70.88µs | 92.09µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 465.73µs | -6.4% | -6.3% | 447.91µs | 595.73µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.241ms | +9.5% |  | 1.133ms | 1.774ms | 14 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 96.61µs | +0.0% |  | 94.56µs | 118.57µs | 13 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.434ms | -4.7% |  | 1.434ms | 2.024ms | 14 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 214.45µs | -4.1% |  | 214.45µs | 246.18µs | 14 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 309.24µs | -0.4% |  | 295.45µs | 373.70µs | 14 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.042ms | +9.9% |  | 2.767ms | 4.523ms | 14 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 455.87µs | +4.2% |  | 410.62µs | 542.42µs | 13 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.361ms | -5.9% |  | 9.361ms | 12.361ms | 14 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.507ms | -3.6% |  | 1.500ms | 1.748ms | 14 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.082ms | +0.1% |  | 1.048ms | 1.303ms | 14 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.023ms | -4.7% |  | 1.018ms | 1.222ms | 19 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.396ms | -0.4% |  | 1.371ms | 1.548ms | 19 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.343ms | -0.9% |  | 7.336ms | 8.816ms | 19 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.611ms | -1.3% |  | 8.611ms | 10.017ms | 19 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 516.98µs | +2.5% | -6.6% | 502.65µs | 787.07µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.023ms | +0.3% | -6.6% | 1.019ms | 1.251ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.065ms | -7.0% | -11.0% ⚠︎ | 4.065ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.114ms | +0.9% | -1.1% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.062ms | -0.7% | +0.0% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.934ms | +14.9% | +6.2% | 2.210ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 121.91µs | +1.3% |  | 100.23µs | 161.14µs | 20 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.125ms | +6.9% |  | 944.27µs | 1.503ms | 20 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 128.684ms | -10.2% |  | 115.889ms | 170.961ms | 20 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.621ms | +5.9% |  | 4.707ms | 7.499ms | 20 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.00µs | +1.2% |  | 0.99µs | 1.19µs | 20 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.57µs | -3.0% |  | 5.26µs | 6.41µs | 20 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 20.10µs | -6.0% |  | 15.93µs | 29.41µs | 20 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.57µs | +0.4% | -1.4% | 2.51µs | 3.44µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.50µs | -6.4% | -16.3% ⚠︎ | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.38µs | +0.9% | -5.4% | 24.16µs | 32.20µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 225.60µs | -0.9% | -9.4% | 223.12µs | 322.31µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.157ms | -1.0% | +6.5% | 1.829ms | 2.989ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.459ms | +2.8% | +5.9% | 11.705ms | 18.409ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 218.439ms | +1.1% | +10.8% ⚠︎ | 159.336ms | 290.378ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 191.63µs | -3.7% |  | 191.63µs | 268.00µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 314.68µs | -6.1% |  | 314.68µs | 473.00µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.561ms | -8.1% |  | 1.495ms | 2.207ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 191.37µs | +3.1% |  | 185.62µs | 283.34µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 537.57µs | +2.1% |  | 526.75µs | 976.95µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.607ms | -5.5% |  | 4.475ms | 12.620ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 186.29µs | +4.4% |  | 171.55µs | 267.92µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 386.94µs | -1.4% |  | 371.58µs | 830.44µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.762ms | +2.2% |  | 2.630ms | 10.511ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 87.37µs | +0.8% |  | 83.88µs | 128.35µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 191.24µs | +1.1% |  | 184.69µs | 261.67µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.297ms | -1.2% |  | 1.226ms | 1.890ms | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.69µs | -4.6% |  | 6.55µs | 8.68µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 17.12µs | -1.3% |  | 14.21µs | 20.91µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 139.48µs | -5.6% |  | 102.78µs | 175.47µs | 24 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 190.78µs | +2.1% | -4.2% | 176.71µs | 267.49µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 395.96µs | +9.9% | -27.4% ⚠︎ | 360.32µs | 643.26µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.019ms | +14.1% | -55.4% ⚠︎ | 2.568ms | 18.547ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 112.48µs | -0.5% |  | 112.48µs | 165.76µs | 19 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.019ms | -0.8% |  | 1.019ms | 1.471ms | 19 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 512.64µs | -1.3% |  | 512.64µs | 745.85µs | 19 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 135.32µs | -3.3% |  | 135.32µs | 273.39µs | 19 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.205ms | -1.6% |  | 1.205ms | 2.357ms | 19 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 612.98µs | -1.6% |  | 612.98µs | 1.202ms | 19 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 136.11µs | +0.1% |  | 135.97µs | 188.74µs | 19 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.944ms | -2.9% |  | 11.650ms | 14.005ms | 19 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 312.310ms | +2.4% |  | 304.987ms | 638.209ms | 19 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 107.61µs | -4.6% | -47.6% ⚠︎ | 102.17µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 928.30µs | -0.3% | -46.0% ⚠︎ | 864.16µs | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 472.49µs | -1.0% | -47.0% ⚠︎ | 438.95µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.959ms | +33.3% | +23.8% ⚠︎ | 1.470ms | 1.959ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.870ms | +23.7% | +14.1% ⚠︎ | 1.488ms | 1.870ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.821ms | +24.9% | +20.9% ⚠︎ | 1.414ms | 1.821ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.388ms | +0.3% | -0.5% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 826.58µs | -6.1% | -12.7% ⚠︎ | 826.58µs | 1.048ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.309ms | -5.2% | -10.5% ⚠︎ | 1.309ms | 1.679ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.307ms | -0.8% | -9.8% | 1.307ms | 1.630ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 110.42µs | -7.5% | -42.6% ⚠︎ | 110.42µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 61.85µs | +1.5% | -2.2% | 60.96µs | 74.62µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 689.25µs | -7.7% | -9.9% | 689.25µs | 860.28µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 712.81µs | -2.5% | +1.3% | 708.46µs | 905.34µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 715.83µs | -4.4% | +0.7% | 715.74µs | 946.43µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 20.86µs | -0.7% | -45.3% ⚠︎ | 20.86µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.22µs | +0.8% | -96.4% ⚠︎ | 21.05µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 32.61µs | -5.1% | -13.2% ⚠︎ | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 587.81µs | -6.6% | -6.5% | 587.81µs | 738.84µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
