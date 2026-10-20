## aui-perf nightly record

_48 points · 2026-09-03T05:27:14.273Z to 2026-10-20T04:37:39.932Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 483.58µs | -19.6% | -24.2% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 571.00µs | -16.6% | -18.7% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 26.54µs | -20.5% | -18.7% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 309.50µs | -17.3% | -13.9% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.700ms | -19.8% | -16.2% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 126.45µs | -19.6% | -17.2% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.174ms | -18.9% | -17.6% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.708ms | -18.4% | -18.1% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.20µs | -20.7% | -22.9% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 42.86µs | -18.9% | -19.5% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 168.64µs | -19.2% | -18.4% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 37.21µs | +6.5% |  | 34.14µs | 44.86µs | 15 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 378.35µs | +11.1% |  | 328.87µs | 414.32µs | 15 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.69µs | +0.6% |  | 4.27µs | 5.49µs | 15 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 39.24µs | +3.8% |  | 35.19µs | 45.55µs | 15 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 323.84µs | -38.9% | -35.3% ⚠︎ | 315.08µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.840ms | -40.0% | -36.9% ⚠︎ | 2.790ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.209ms | -40.0% | -36.9% ⚠︎ | 10.968ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 192.99µs | -42.5% | -33.9% ⚠︎ | 180.10µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.793ms | -41.4% | -33.9% ⚠︎ | 1.693ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.959ms | -35.0% | -26.4% ⚠︎ | 6.701ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.54µs | +7.1% | +18.7% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 322.86µs | +4.6% | +29.4% ⚠︎ | 256.80µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.763ms | +4.5% | +27.2% ⚠︎ | 1.399ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 33.22µs | -0.7% | +2.9% | 27.63µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 359.86µs | +6.1% | +11.0% ⚠︎ | 283.86µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.888ms | +5.3% | +5.1% | 1.545ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 20.21µs | +1.9% | -7.4% | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 195.86µs | -1.7% | -6.3% | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.074ms | +0.4% | -10.1% ⚠︎ | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +9.5% | +8.4% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +4.1% | +15.0% ⚠︎ | 0.17µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.19µs | +3.7% | +20.5% ⚠︎ | 1.04µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | +3.9% | +17.0% ⚠︎ | 0.32µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.77µs | +7.4% | -5.8% | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.81µs | +6.7% | -7.6% | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 78.61µs | +6.5% | +4.1% | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 472.18µs | -0.7% | -9.2% | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.330ms | -11.0% |  | 1.133ms | 1.495ms | 9 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 107.10µs |  |  | 96.59µs | 118.57µs | 8 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.538ms | +6.1% |  | 1.450ms | 1.686ms | 9 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 231.57µs | +4.3% |  | 216.72µs | 246.18µs | 9 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 328.93µs | +11.3% |  | 295.45µs | 369.60µs | 9 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.334ms | +2.4% |  | 2.767ms | 3.334ms | 9 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 488.43µs |  |  | 437.69µs | 529.40µs | 8 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.658ms | -0.1% |  | 9.408ms | 11.266ms | 9 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.586ms | +2.9% |  | 1.500ms | 1.748ms | 9 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.134ms | +8.2% |  | 1.048ms | 1.303ms | 9 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.065ms | +1.2% |  | 1.018ms | 1.222ms | 14 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.436ms | +0.5% |  | 1.371ms | 1.499ms | 14 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 8.115ms | +6.7% |  | 7.336ms | 8.816ms | 14 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.303ms | +7.2% |  | 8.670ms | 10.017ms | 14 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 622.26µs | +21.6% | +15.5% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.069ms | +4.2% | -11.7% ⚠︎ | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.537ms | +8.7% | +7.7% | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.142ms | +1.4% | +2.8% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.081ms | +1.8% | -4.3% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.558ms | -19.4% | +8.6% | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 121.72µs | +5.4% |  | 100.23µs | 152.70µs | 15 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.155ms | +7.6% |  | 944.27µs | 1.409ms | 15 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 147.294ms | -8.7% |  | 115.889ms | 170.961ms | 15 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.818ms | +9.4% |  | 4.707ms | 6.895ms | 15 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.13µs | +13.2% |  | 0.99µs | 1.19µs | 15 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.01µs | +7.0% |  | 5.26µs | 6.13µs | 15 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 21.43µs | +9.4% |  | 15.93µs | 22.77µs | 15 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.72µs | +5.1% | -11.9% ⚠︎ | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 12.35µs | +17.2% | -0.5% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.16µs | +5.4% | -13.9% ⚠︎ | 24.16µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 259.83µs | +14.5% | -9.2% | 222.97µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.538ms | +27.6% | +51.6% ⚠︎ | 1.551ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.820ms | +19.8% | +27.8% ⚠︎ | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 255.323ms | +23.0% | +69.4% ⚠︎ | 159.336ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 229.73µs | +14.7% |  | 197.56µs | 268.00µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 378.95µs | +12.1% |  | 327.73µs | 473.00µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.032ms | +20.2% |  | 1.495ms | 2.207ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 222.14µs | +14.4% |  | 185.62µs | 283.34µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 605.99µs | +12.1% |  | 526.75µs | 976.95µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.507ms | +36.6% |  | 4.475ms | 12.620ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 194.36µs | +12.5% |  | 171.55µs | 267.92µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 428.86µs | +8.8% |  | 371.58µs | 830.44µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.621ms | +35.2% |  | 2.630ms | 10.511ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 109.68µs | +16.5% |  | 83.88µs | 119.89µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 210.60µs | +12.9% |  | 184.69µs | 261.67µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.386ms | +7.2% |  | 1.226ms | 1.747ms | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.57µs | +10.9% |  | 6.55µs | 8.63µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 18.98µs | +30.7% |  | 14.21µs | 20.60µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 159.36µs | +55.0% |  | 102.78µs | 175.47µs | 19 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 214.85µs | +11.8% | -42.1% ⚠︎ | 168.27µs | 297.15µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 393.97µs | +0.3% | -76.9% ⚠︎ | 360.32µs | 1.609ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.113ms | +21.2% | -91.2% ⚠︎ | 2.568ms | 46.080ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 115.61µs | -14.2% |  | 113.03µs | 165.76µs | 14 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.069ms | -12.9% |  | 1.028ms | 1.471ms | 14 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 527.26µs | -14.0% |  | 519.49µs | 745.85µs | 14 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 141.99µs | -36.6% |  | 139.99µs | 273.39µs | 14 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.237ms | -36.5% |  | 1.225ms | 2.357ms | 14 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 632.46µs | -35.9% |  | 622.90µs | 1.202ms | 14 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 142.51µs | +1.1% |  | 135.97µs | 166.92µs | 14 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.662ms | +2.4% |  | 11.650ms | 14.005ms | 14 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 363.732ms | +18.2% |  | 304.987ms | 363.732ms | 14 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 113.12µs | -44.0% | -36.7% ⚠︎ | 112.80µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 945.41µs | -42.5% | -38.2% ⚠︎ | 931.46µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 501.02µs | -41.4% | -35.9% ⚠︎ | 477.11µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.550ms | +1.0% | -8.3% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.536ms | -0.7% | -5.9% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.500ms | +0.6% | -5.4% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.496ms | +3.2% | +5.3% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 886.95µs | -0.5% | -6.9% | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.407ms | -0.4% | -2.8% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.425ms | +3.5% | -2.1% | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 119.98µs | +2.0% | -38.7% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 67.10µs | +5.0% | +8.5% | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 745.82µs | -0.3% | +0.1% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 763.89µs | -0.7% | -2.3% | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 777.61µs | +0.4% | -3.4% | 698.49µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 22.66µs | +4.1% | -38.8% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.53µs | +1.4% | -96.6% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.78µs | -1.8% | -0.1% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 649.95µs | -3.2% | +5.1% | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
