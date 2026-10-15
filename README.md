## aui-perf nightly record

_43 points · 2026-09-03T05:27:14.273Z to 2026-10-15T04:37:29.975Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 482.81µs | -31.1% | -19.5% ⚠︎ | 482.81µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 567.13µs | -29.5% | -15.2% ⚠︎ | 567.13µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 26.09µs | -34.7% | -21.1% ⚠︎ | 26.09µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 300.46µs | -32.5% | -19.6% ⚠︎ | 300.46µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 4.704ms | -31.6% | -19.6% ⚠︎ | 4.704ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 124.80µs | -32.8% | -21.4% ⚠︎ | 124.80µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.156ms | -32.3% | -21.5% ⚠︎ | 1.156ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 4.622ms | -32.4% | -21.4% ⚠︎ | 4.622ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 4.97µs | -36.9% | -25.8% ⚠︎ | 4.97µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 40.73µs | -33.7% | -23.8% ⚠︎ | 40.73µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 161.58µs | -34.4% | -23.6% ⚠︎ | 161.58µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 34.60µs | -14.8% |  | 34.14µs | 44.86µs | 10 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 340.64µs | -14.6% |  | 328.87µs | 414.32µs | 10 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.33µs | -15.0% |  | 4.27µs | 5.46µs | 10 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 36.57µs | -10.4% |  | 35.19µs | 45.55µs | 10 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 319.33µs | -48.9% | -35.5% ⚠︎ | 319.33µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.810ms | -49.9% | -37.9% ⚠︎ | 2.810ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 11.122ms | -50.9% | -38.0% ⚠︎ | 11.122ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 180.10µs | -53.8% | -45.3% ⚠︎ | 180.10µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.708ms | -53.4% | -44.7% ⚠︎ | 1.708ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.701ms | -55.2% | -46.7% ⚠︎ | 6.701ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 28.27µs | -1.8% | +15.9% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 315.25µs | +1.1% | +17.7% ⚠︎ | 249.56µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.697ms | +2.3% | +22.6% ⚠︎ | 1.386ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 32.98µs | -14.3% | +17.4% ⚠︎ | 27.25µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 337.94µs | -16.4% | +18.0% ⚠︎ | 274.56µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.861ms | -13.6% | +22.8% ⚠︎ | 1.524ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.63µs | -14.2% | +5.4% | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 192.39µs | -14.4% | +6.3% | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.038ms | -17.1% | +3.2% | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | -12.5% | +4.7% | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.20µs | -11.3% | +14.4% ⚠︎ | 0.17µs | 0.22µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.19µs | -14.9% | +9.8% | 0.99µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.36µs | -12.8% | +12.5% ⚠︎ | 0.30µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.79µs | -13.6% | +10.0% ⚠︎ | 1.58µs | 2.10µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 15.52µs | -15.8% | +8.2% | 14.02µs | 19.26µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 74.20µs | -14.0% | +2.7% | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 479.70µs | -15.2% | +1.0% | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.154ms |  |  | 1.152ms | 1.495ms | 4 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 97.28µs |  |  | 97.28µs | 118.57µs | 3 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.478ms |  |  | 1.450ms | 1.686ms | 4 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 216.87µs |  |  | 216.72µs | 246.18µs | 4 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 312.97µs |  |  | 295.45µs | 369.60µs | 4 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.087ms |  |  | 3.030ms | 3.281ms | 4 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 460.02µs |  |  | 460.02µs | 519.00µs | 3 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.547ms |  |  | 9.408ms | 11.266ms | 4 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.500ms |  |  | 1.500ms | 1.748ms | 4 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.092ms |  |  | 1.048ms | 1.303ms | 4 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.034ms | -15.4% |  | 1.018ms | 1.222ms | 9 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.454ms | -3.0% |  | 1.371ms | 1.499ms | 9 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.440ms | -15.6% |  | 7.336ms | 8.816ms | 9 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.690ms | -13.2% |  | 8.670ms | 10.017ms | 9 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 580.46µs | -20.5% | +40.9% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.067ms | -12.0% | -3.0% | 1.021ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.406ms | -15.7% | +7.7% | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.145ms | +1.9% | -1.0% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.076ms | -8.7% | +0.9% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.425ms | -4.2% | -5.9% | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 121.02µs | -20.7% |  | 100.23µs | 152.70µs | 10 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.058ms | -22.7% |  | 944.27µs | 1.409ms | 10 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 144.115ms | -14.0% |  | 115.889ms | 170.961ms | 10 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.191ms | -24.7% |  | 4.707ms | 6.895ms | 10 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.01µs | -15.6% |  | 0.99µs | 1.19µs | 10 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.82µs | +0.9% |  | 5.62µs | 6.13µs | 10 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 20.99µs | +20.3% |  | 17.15µs | 22.77µs | 10 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.61µs | -14.5% | +1.1% | 2.51µs | 3.21µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.03µs | -5.0% | -9.1% | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.74µs | -14.9% | -0.5% | 24.32µs | 30.73µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 232.37µs | -10.5% | +7.5% | 222.97µs | 287.79µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.203ms | -15.7% | +26.8% ⚠︎ | 1.549ms | 2.887ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 15.394ms | +2.4% | +17.9% ⚠︎ | 11.705ms | 17.585ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 236.361ms | +5.4% | +28.1% ⚠︎ | 150.737ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 202.23µs | -16.3% |  | 197.56µs | 268.00µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 347.75µs | -26.5% |  | 327.73µs | 473.00µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.752ms | -20.6% |  | 1.495ms | 2.207ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 198.58µs | -29.9% |  | 187.05µs | 283.34µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 568.06µs | -40.5% |  | 528.14µs | 976.95µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 5.762ms | -54.3% |  | 4.475ms | 12.620ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 199.28µs | -11.6% |  | 171.55µs | 267.92µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 449.43µs | -39.5% |  | 371.58µs | 830.44µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.976ms | -71.7% |  | 2.630ms | 10.511ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 87.77µs | -21.2% |  | 83.88µs | 119.89µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 198.04µs | -15.0% |  | 184.69µs | 261.67µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.468ms | -8.3% |  | 1.226ms | 1.624ms | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.79µs | -13.9% |  | 6.55µs | 8.38µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.96µs | -15.1% |  | 14.21µs | 18.29µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 110.24µs | -14.1% |  | 102.78µs | 128.33µs | 14 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 181.99µs | -25.7% | -37.5% ⚠︎ | 168.27µs | 378.51µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 426.30µs | -32.5% | -75.9% ⚠︎ | 374.00µs | 1.779ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.267ms | -62.1% | -92.9% ⚠︎ | 2.568ms | 54.890ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 114.80µs | -30.7% |  | 114.80µs | 165.76µs | 9 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.059ms | -28.0% |  | 1.059ms | 1.471ms | 9 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 533.53µs | -28.5% |  | 533.53µs | 745.85µs | 9 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 141.87µs | -48.1% |  | 141.87µs | 273.39µs | 9 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.267ms | -46.2% |  | 1.267ms | 2.357ms | 9 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 643.84µs | -46.4% |  | 643.84µs | 1.202ms | 9 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 138.92µs | -16.8% |  | 138.92µs | 166.92µs | 9 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.529ms | -10.5% |  | 12.360ms | 14.005ms | 9 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 318.295ms | -11.8% |  | 307.789ms | 360.804ms | 9 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 117.03µs | -51.7% | -41.3% ⚠︎ | 117.03µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 947.47µs | -52.7% | -44.7% ⚠︎ | 947.47µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 490.73µs | -52.3% | -43.9% ⚠︎ | 490.73µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.482ms | -15.2% | -7.9% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.522ms | -13.9% | -4.0% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.445ms | -13.7% | -6.9% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.433ms | -17.3% | -2.1% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 878.08µs | -14.2% | +0.2% | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.384ms | -13.1% | -1.9% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.309ms | -18.4% | -6.7% | 1.309ms | 1.608ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 115.16µs | -16.4% | -39.1% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 62.08µs | -15.6% | +2.1% | 60.09µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 723.41µs | -12.8% | -2.6% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 729.76µs | -16.8% | +5.9% | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 743.52µs | -17.6% | +7.2% | 698.49µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.42µs | -47.4% | -41.4% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 21.73µs | -96.9% | -96.5% ⚠︎ | 21.26µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.22µs | -5.1% | -1.3% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 639.23µs | -10.8% | +7.2% | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
