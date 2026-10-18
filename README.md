## aui-perf nightly record

_46 points · 2026-09-03T05:27:14.273Z to 2026-10-18T04:36:10.279Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 464.56µs | -26.2% | -24.2% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 538.74µs | -22.7% | -21.2% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 25.35µs | -23.9% | -25.5% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 291.86µs | -21.8% | -25.9% ⚠︎ | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.568ms | -22.0% | -22.4% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 121.35µs | -23.2% | -23.0% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.125ms | -22.4% | -22.7% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.477ms | -22.8% | -22.5% ⚠︎ | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.79µs | -30.5% | -28.5% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 39.16µs | -30.2% | -27.4% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 155.39µs | -29.8% | -27.6% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 34.47µs | +1.0% |  | 34.14µs | 44.86µs | 13 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 331.57µs | -2.3% |  | 328.87µs | 414.32µs | 13 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.46µs | +3.7% |  | 4.27µs | 5.49µs | 13 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 37.72µs | +7.2% |  | 35.19µs | 45.55µs | 13 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 315.08µs | -40.2% | -40.4% ⚠︎ | 315.08µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.790ms | -41.7% | -41.6% ⚠︎ | 2.790ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.968ms | -42.0% | -42.2% ⚠︎ | 10.968ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 188.11µs | -43.6% | -43.8% ⚠︎ | 180.10µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.693ms | -44.1% | -46.6% ⚠︎ | 1.693ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.919ms | -43.0% | -44.5% ⚠︎ | 6.701ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.79µs | -3.2% | +14.6% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 308.81µs | -1.9% | +17.6% ⚠︎ | 249.56µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.666ms | -0.9% | +17.0% ⚠︎ | 1.386ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 32.24µs | -4.1% | +15.4% ⚠︎ | 27.63µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 335.73µs | -3.7% | +19.4% ⚠︎ | 283.86µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.808ms | -2.1% | +18.6% ⚠︎ | 1.545ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.18µs | -6.6% | +4.2% | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 185.12µs | -7.5% | +3.2% | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.052ms | -4.9% | +5.5% | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | +3.3% | +3.0% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | +1.0% | +10.6% ⚠︎ | 0.17µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.16µs | -4.5% | +8.4% | 0.99µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.35µs | -1.8% | +7.0% | 0.30µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.71µs | -6.0% | +4.3% | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.14µs | -6.7% | +2.7% | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 72.89µs | -0.8% | -1.1% | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 497.67µs | +6.8% | +7.8% | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.133ms |  |  | 1.133ms | 1.495ms | 7 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 96.59µs |  |  | 96.59µs | 118.57µs | 6 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.504ms |  |  | 1.450ms | 1.686ms | 7 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 223.64µs |  |  | 216.72µs | 246.18µs | 7 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 310.46µs |  |  | 295.45µs | 369.60µs | 7 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 2.767ms |  |  | 2.767ms | 3.283ms | 7 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 437.69µs |  |  | 437.69µs | 529.40µs | 6 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.950ms |  |  | 9.408ms | 11.266ms | 7 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.563ms |  |  | 1.500ms | 1.748ms | 7 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.080ms |  |  | 1.048ms | 1.303ms | 7 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.073ms | +0.3% |  | 1.018ms | 1.222ms | 12 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.402ms | +1.4% |  | 1.371ms | 1.499ms | 12 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.412ms | -5.0% |  | 7.336ms | 8.816ms | 12 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.727ms | -3.4% |  | 8.670ms | 10.017ms | 12 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 504.15µs | -14.1% | +15.2% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.019ms | -5.1% | -6.3% | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.370ms | +1.7% | +7.2% | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.104ms | -3.6% | -3.1% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.069ms | +0.9% | -0.6% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.553ms | -9.7% | -11.4% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 120.31µs | +2.2% |  | 100.23µs | 152.70µs | 13 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.053ms | -0.2% |  | 944.27µs | 1.409ms | 13 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 143.312ms | -7.1% |  | 115.889ms | 170.961ms | 13 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.308ms | +3.4% |  | 4.707ms | 6.895ms | 13 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 0.99µs | -3.4% |  | 0.99µs | 1.19µs | 13 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.74µs | -1.3% |  | 5.26µs | 6.13µs | 13 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 21.39µs | +0.8% |  | 16.07µs | 22.77µs | 13 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.56µs | -2.6% | -0.9% | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.22µs | +1.4% | -3.5% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.16µs | -2.9% | -5.8% | 24.16µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 227.60µs | -4.9% | -1.4% | 222.97µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.178ms | +5.7% | +25.6% ⚠︎ | 1.551ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 14.060ms | +3.1% | +9.8% | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 216.075ms | -0.0% | +22.1% ⚠︎ | 150.737ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 198.96µs | -3.8% |  | 197.56µs | 268.00µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 335.19µs | -2.3% |  | 327.73µs | 473.00µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.698ms | +4.9% |  | 1.495ms | 2.207ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 185.62µs | -3.9% |  | 185.62µs | 283.34µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 526.75µs | -0.3% |  | 526.75µs | 976.95µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.876ms | -5.6% |  | 4.475ms | 12.620ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 178.51µs | -2.4% |  | 171.55µs | 267.92µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 392.31µs | -1.5% |  | 371.58µs | 830.44µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.703ms | +2.8% |  | 2.630ms | 10.511ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 86.66µs | -4.9% |  | 83.88µs | 119.89µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 189.08µs | -1.5% |  | 184.69µs | 261.67µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.313ms | +0.1% |  | 1.226ms | 1.747ms | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.01µs | +6.5% |  | 6.55µs | 8.63µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 17.34µs | +17.1% |  | 14.21µs | 20.60µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 147.83µs | +39.7% |  | 102.78µs | 175.47µs | 17 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 186.85µs | -5.9% | -33.1% ⚠︎ | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 360.32µs | -10.3% | -76.8% ⚠︎ | 360.32µs | 1.779ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.647ms | -12.8% | -94.3% ⚠︎ | 2.568ms | 46.080ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 113.03µs | -17.6% |  | 113.03µs | 165.76µs | 12 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.028ms | -16.2% |  | 1.028ms | 1.471ms | 12 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 519.49µs | -16.3% |  | 519.49µs | 745.85µs | 12 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 139.99µs | -39.0% |  | 139.99µs | 273.39µs | 12 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.225ms | -38.4% |  | 1.225ms | 2.357ms | 12 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 622.90µs | -38.4% |  | 622.90µs | 1.202ms | 12 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 135.97µs | -5.6% |  | 135.97µs | 166.92µs | 12 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.303ms | -1.1% |  | 11.982ms | 14.005ms | 12 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 304.987ms | -3.0% |  | 304.987ms | 360.804ms | 12 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 112.80µs | -44.1% | -42.6% ⚠︎ | 112.80µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 931.46µs | -44.3% | -44.4% ⚠︎ | 931.46µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 477.11µs | -45.4% | -44.8% ⚠︎ | 477.11µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.470ms | -3.0% | -12.8% ⚠︎ | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.512ms | -0.0% | -8.7% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.458ms | +0.8% | -10.2% ⚠︎ | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.384ms | -3.5% | -4.3% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 880.55µs | +0.1% | -3.2% | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.380ms | -3.7% | -8.3% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.317ms | -5.4% | -10.4% ⚠︎ | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 119.33µs | +1.1% | -37.4% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.96µs | -2.9% | +0.1% | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 746.37µs | +1.2% | -3.9% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 730.87µs | -2.1% | +2.7% | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 749.07µs | -1.5% | +6.9% | 698.49µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.00µs | -2.5% | -41.3% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.05µs | -3.1% | -96.6% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.36µs | -1.0% | +0.4% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 629.42µs | -5.2% | +3.4% | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
