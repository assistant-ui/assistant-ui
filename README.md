## aui-perf nightly record

_47 points · 2026-09-03T05:27:14.273Z to 2026-10-19T04:39:53.832Z · latest runner: AMD EPYC · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 505.10µs | -16.3% | -20.9% ⚠︎ | 464.56µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 600.18µs | -11.9% | -14.5% ⚠︎ | 538.74µs | 808.41µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 27.77µs | -15.8% | -14.9% ⚠︎ | 25.35µs | 40.75µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 325.50µs | -11.6% | -9.5% | 291.86µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.092ms | -11.6% | -9.2% | 4.568ms | 6.892ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 136.48µs | -11.3% | -10.7% ⚠︎ | 121.35µs | 190.46µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.268ms | -10.7% | -11.1% ⚠︎ | 1.125ms | 1.714ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.051ms | -11.3% | -12.1% ⚠︎ | 4.477ms | 6.879ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.41µs | -17.4% | -19.7% ⚠︎ | 4.79µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 42.40µs | -20.8% | -20.4% ⚠︎ | 39.16µs | 61.59µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 164.03µs | -21.8% | -20.6% ⚠︎ | 155.39µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 37.05µs | +3.9% |  | 34.14µs | 44.86µs | 14 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 354.47µs | +2.0% |  | 328.87µs | 414.32µs | 14 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.93µs | +7.1% |  | 4.27µs | 5.49µs | 14 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 38.40µs | +2.3% |  | 35.19µs | 45.55µs | 14 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 347.73µs | -33.1% | -30.5% ⚠︎ | 315.08µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 3.074ms | -34.7% | -31.6% ⚠︎ | 2.790ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 12.161ms | -35.1% | -31.5% ⚠︎ | 10.968ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 192.82µs | -42.7% | -34.0% ⚠︎ | 180.10µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.814ms | -41.5% | -33.2% ⚠︎ | 1.693ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 7.140ms | -42.2% | -34.0% ⚠︎ | 6.701ms | 15.002ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 29.72µs | +6.8% | +19.4% ⚠︎ | 23.95µs | 32.33µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 331.54µs | +8.0% | +32.9% ⚠︎ | 256.80µs | 364.42µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.805ms | +8.3% | +30.3% ⚠︎ | 1.399ms | 1.971ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 34.72µs | +4.5% | +7.6% | 27.63µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 355.68µs | +4.4% | +9.7% | 283.86µs | 404.10µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.956ms | +4.3% | +8.9% | 1.545ms | 2.179ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 21.11µs | +5.4% | -3.3% | 18.01µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 204.48µs | +1.8% | -2.2% | 174.51µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.159ms | +7.8% | -3.0% | 983.29µs | 1.304ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.12µs | +10.6% | +12.3% ⚠︎ | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +6.7% | +20.0% ⚠︎ | 0.17µs | 0.23µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.27µs | +9.9% | +28.3% ⚠︎ | 1.04µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.37µs | +8.6% | +23.2% ⚠︎ | 0.32µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.86µs | +11.3% | -1.4% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 16.70µs | +12.1% | -2.4% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.98µs | +0.9% | -2.0% | 70.58µs | 89.54µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 484.59µs | +1.5% | -6.9% | 447.91µs | 596.48µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.201ms |  |  | 1.133ms | 1.495ms | 8 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 105.62µs |  |  | 96.59µs | 118.57µs | 7 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.509ms |  |  | 1.450ms | 1.686ms | 8 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 225.02µs |  |  | 216.72µs | 246.18µs | 8 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 331.68µs |  |  | 295.45µs | 369.60µs | 8 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.059ms |  |  | 2.767ms | 3.283ms | 8 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 497.06µs |  |  | 437.69µs | 529.40µs | 7 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 10.066ms |  |  | 9.408ms | 11.266ms | 8 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.570ms |  |  | 1.500ms | 1.748ms | 8 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.174ms |  |  | 1.048ms | 1.303ms | 8 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.118ms | +9.0% |  | 1.018ms | 1.222ms | 13 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.438ms | +3.4% |  | 1.371ms | 1.499ms | 13 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.896ms | +6.9% |  | 7.336ms | 8.816ms | 13 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.296ms | +6.5% |  | 8.670ms | 10.017ms | 13 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 620.87µs | +23.4% | +15.3% ⚠︎ | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.112ms | +7.6% | -8.2% | 1.019ms | 1.251ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.573ms | +10.8% | +8.5% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.121ms | +0.2% | +0.9% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.087ms | +2.7% | -3.8% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.583ms | -6.9% | +9.6% | 2.210ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 136.03µs | +17.1% |  | 100.23µs | 152.70µs | 14 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.260ms | +19.9% |  | 944.27µs | 1.409ms | 14 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 161.178ms | +2.2% |  | 115.889ms | 170.961ms | 14 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 6.456ms | +24.0% |  | 4.707ms | 6.895ms | 14 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.10µs | +10.5% |  | 0.99µs | 1.19µs | 14 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.26µs | -6.7% |  | 5.26µs | 6.13µs | 14 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 15.93µs | -18.9% |  | 15.93µs | 22.77µs | 14 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.79µs | +7.8% | -9.5% | 2.51µs | 3.21µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.01µs | +2.6% | -11.3% ⚠︎ | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 26.66µs | +7.9% | -12.3% ⚠︎ | 24.16µs | 30.73µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 249.13µs | +7.7% | -12.9% ⚠︎ | 222.97µs | 287.79µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.479ms | +23.5% | +48.1% ⚠︎ | 1.551ms | 2.888ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 17.243ms | +30.1% | +39.3% ⚠︎ | 11.705ms | 18.189ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 254.348ms | +21.7% | +68.7% ⚠︎ | 159.336ms | 290.378ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 210.65µs | +6.6% |  | 197.56µs | 268.00µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 344.27µs | +5.0% |  | 327.73µs | 473.00µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.936ms | +22.2% |  | 1.495ms | 2.207ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 210.68µs | +12.6% |  | 185.62µs | 283.34µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 609.13µs | +14.3% |  | 526.75µs | 976.95µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 6.205ms | +38.7% |  | 4.475ms | 12.620ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 194.99µs | +13.7% |  | 171.55µs | 267.92µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 417.97µs | +8.4% |  | 371.58µs | 830.44µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 3.044ms | +9.3% |  | 2.630ms | 10.511ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 101.93µs | +9.1% |  | 83.88µs | 119.89µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 206.92µs | +11.3% |  | 184.69µs | 261.67µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.540ms | +24.3% |  | 1.226ms | 1.747ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 7.85µs | +17.4% |  | 6.55µs | 8.63µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 19.08µs | +34.3% |  | 14.21µs | 20.60µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 150.98µs | +46.0% |  | 102.78µs | 175.47µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 234.88µs | +26.5% | -36.8% ⚠︎ | 168.27µs | 297.15µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 388.23µs | +3.8% | -77.3% ⚠︎ | 360.32µs | 1.609ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 3.405ms | +24.5% | -90.4% ⚠︎ | 2.568ms | 46.080ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 127.39µs | -9.5% |  | 113.03µs | 165.76µs | 13 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.142ms | -9.7% |  | 1.028ms | 1.471ms | 13 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 581.71µs | -8.9% |  | 519.49µs | 745.85µs | 13 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 151.29µs | -35.2% |  | 139.99µs | 273.39µs | 13 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.348ms | -34.0% |  | 1.225ms | 2.357ms | 13 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 688.17µs | -33.3% |  | 622.90µs | 1.202ms | 13 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 149.36µs | +1.6% |  | 135.97µs | 166.92µs | 13 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 11.650ms | -7.1% |  | 11.650ms | 14.005ms | 13 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 328.866ms | +2.8% |  | 304.987ms | 360.804ms | 13 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 121.77µs | -41.5% | -31.9% ⚠︎ | 112.80µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.018ms | -40.7% | -33.5% ⚠︎ | 931.46µs | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 520.06µs | -41.5% | -33.5% ⚠︎ | 477.11µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.626ms | +8.4% | -3.9% | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.567ms | +3.3% | -4.1% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.503ms | +3.7% | -5.2% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.535ms | +9.1% | +8.1% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 952.64µs | +7.6% | -0.0% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.516ms | +10.8% | +4.8% | 1.337ms | 1.679ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.494ms | +12.3% | +2.6% | 1.309ms | 1.630ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 124.65µs | +8.8% | -36.3% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 66.94µs | +8.5% | +8.3% | 60.09µs | 74.62µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 785.28µs | +9.2% | +5.4% | 693.26µs | 860.28µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 797.93µs | +9.3% | +2.0% | 703.37µs | 905.34µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 808.74µs | +9.3% | +0.4% | 698.49µs | 946.43µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 23.55µs | +12.4% | -36.4% ⚠︎ | 20.95µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 23.90µs | +12.4% | -96.4% ⚠︎ | 21.05µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.07µs | +1.7% | +0.8% | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 640.00µs | -1.0% | +3.5% | 598.94µs | 738.84µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
