## aui-perf nightly record

_49 points · 2026-09-03T05:27:14.273Z to 2026-10-21T04:39:01.187Z · latest runner: Intel(R) Xeon(R) Processor · Node v24.22.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 504.98µs | -19.8% | -16.0% ⚠︎ | 464.56µs | 700.65µs | 31 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 601.51µs | -15.3% | -13.9% ⚠︎ | 538.74µs | 808.41µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 29.03µs | -16.9% | -11.8% ⚠︎ | 25.35µs | 40.75µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 337.10µs | -12.8% | -9.2% | 291.86µs | 444.94µs | 31 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.085ms | -16.1% | -12.1% ⚠︎ | 4.568ms | 6.892ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 137.90µs | -12.6% | -10.8% ⚠︎ | 121.35µs | 190.46µs | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.213ms | -15.7% | -15.1% ⚠︎ | 1.125ms | 1.714ms | 31 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.115ms | -11.2% | -9.9% | 4.477ms | 6.879ms | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 5.03µs | -25.7% | -23.6% ⚠︎ | 4.79µs | 7.88µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 42.17µs | -23.0% | -21.1% ⚠︎ | 39.16µs | 61.59µs | 31 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 161.03µs | -25.2% | -23.5% ⚠︎ | 155.39µs | 246.32µs | 31 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 38.47µs | +8.8% |  | 34.14µs | 44.86µs | 16 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 350.58µs | +1.3% |  | 328.87µs | 414.32µs | 16 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 5.46µs | +17.9% |  | 4.27µs | 5.49µs | 16 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 41.70µs | +7.9% |  | 35.19µs | 45.55µs | 16 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 331.90µs | -38.1% | -35.8% ⚠︎ | 315.08µs | 624.45µs | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 2.746ms | -42.8% | -41.4% ⚠︎ | 2.746ms | 5.608ms | 31 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 10.891ms | -43.2% | -41.8% ⚠︎ | 10.891ms | 22.665ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 167.17µs | -49.7% | -46.6% ⚠︎ | 167.17µs | 389.68µs | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 1.654ms | -46.5% | -44.1% ⚠︎ | 1.654ms | 3.727ms | 31 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 6.247ms | -50.1% | -48.0% ⚠︎ | 6.247ms | 15.002ms | 31 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 31.76µs | +13.2% | +32.0% ⚠︎ | 23.95µs | 32.33µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 324.55µs | +4.4% | +24.8% ⚠︎ | 256.80µs | 364.42µs | 31 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.775ms | +6.8% | +26.8% ⚠︎ | 1.400ms | 1.971ms | 31 |
| external-message-conversion › core: external message tool results › 100 matches | 38.91µs | +15.6% | +40.8% ⚠︎ | 32.24µs | 39.67µs | 31 |
| external-message-conversion › core: external message tool results › 1000 matches | 390.95µs | +14.1% | +37.7% ⚠︎ | 330.50µs | 404.10µs | 31 |
| external-message-conversion › core: external message tool results › 5000 matches | 2.171ms | +18.5% | +40.6% ⚠︎ | 1.792ms | 2.179ms | 31 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 23.51µs | +15.9% | +26.6% ⚠︎ | 18.01µs | 23.98µs | 31 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 227.46µs | +14.4% | +26.8% ⚠︎ | 174.51µs | 230.06µs | 31 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.304ms | +21.2% | +31.6% ⚠︎ | 983.29µs | 1.304ms | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.11µs | +8.9% | +12.2% ⚠︎ | 0.10µs | 0.12µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.21µs | +1.4% | +19.3% ⚠︎ | 0.18µs | 0.23µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.17µs | -3.1% | +10.1% ⚠︎ | 1.04µs | 1.40µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | -6.0% | +2.7% | 0.32µs | 0.41µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 2.14µs | +23.0% | +35.3% ⚠︎ | 1.63µs | 2.14µs | 31 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 19.98µs | +28.5% | +42.5% ⚠︎ | 14.46µs | 19.98µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 82.55µs | +10.1% | +12.0% ⚠︎ | 70.58µs | 89.54µs | 31 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 557.52µs | +16.3% | +18.1% ⚠︎ | 447.91µs | 596.48µs | 31 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.774ms | +54.0% |  | 1.133ms | 1.774ms | 10 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tildes after prose | 102.47µs | +4.3% |  | 96.59µs | 118.57µs | 9 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 2.024ms | +37.4% |  | 1.450ms | 2.024ms | 10 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 241.18µs | +11.3% |  | 216.72µs | 246.18µs | 10 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 373.70µs | +17.1% |  | 295.45µs | 373.70µs | 10 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 4.523ms | +49.3% |  | 2.767ms | 4.523ms | 10 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tildes after prose | 428.06µs | -7.8% |  | 428.06µs | 529.40µs | 9 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 12.361ms | +31.4% |  | 9.408ms | 12.361ms | 10 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.690ms | +10.2% |  | 1.500ms | 1.748ms | 10 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.209ms | +6.6% |  | 1.048ms | 1.303ms | 10 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.149ms | +9.7% |  | 1.018ms | 1.222ms | 15 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.548ms | +7.3% |  | 1.371ms | 1.548ms | 15 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.916ms | +6.0% |  | 7.336ms | 8.816ms | 15 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 9.308ms | +6.5% |  | 8.670ms | 10.017ms | 15 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 686.00µs | +11.0% | +70.5% ⚠︎ | 371.23µs | 730.11µs | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.176ms | +8.0% | +11.2% ⚠︎ | 1.019ms | 1.251ms | 31 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.503ms | +3.8% | +11.8% ⚠︎ | 4.007ms | 5.227ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.131ms | +0.2% | -0.2% | 1.095ms | 1.180ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.127ms | +5.2% | +6.7% | 1.041ms | 1.178ms | 31 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.460ms | -6.3% | -16.2% ⚠︎ | 2.210ms | 3.172ms | 31 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 115.32µs | -4.6% |  | 100.23µs | 152.70µs | 16 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.075ms | -2.2% |  | 944.27µs | 1.409ms | 16 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 152.291ms | +4.7% |  | 115.889ms | 170.961ms | 16 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.474ms | +1.3% |  | 4.707ms | 6.895ms | 16 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.13µs | +8.9% |  | 0.99µs | 1.19µs | 16 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 6.41µs | +4.7% |  | 5.26µs | 6.41µs | 16 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 29.41µs | +29.2% |  | 15.93µs | 29.41µs | 16 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 3.44µs | +30.2% | +36.6% ⚠︎ | 2.51µs | 3.44µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 13.73µs | +17.0% | +22.8% ⚠︎ | 10.04µs | 13.96µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 32.20µs | +27.2% | +32.1% ⚠︎ | 24.16µs | 32.20µs | 31 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 322.31µs | +29.6% | +44.4% ⚠︎ | 222.97µs | 322.31µs | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 2.832ms | +27.1% | +82.6% ⚠︎ | 1.614ms | 2.888ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 16.888ms | +10.9% | +39.6% ⚠︎ | 11.705ms | 18.189ms | 31 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 222.905ms | -5.2% | +28.1% ⚠︎ | 159.336ms | 290.378ms | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 258.62µs | +26.5% |  | 197.56µs | 268.00µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 427.41µs | +20.0% |  | 327.73µs | 473.00µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 2.137ms | +29.1% |  | 1.495ms | 2.207ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 256.10µs | +19.1% |  | 185.62µs | 283.34µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 781.39µs | +24.0% |  | 526.75µs | 976.95µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 7.226ms | +32.5% |  | 4.475ms | 12.620ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 255.76µs | +32.4% |  | 171.55µs | 267.92µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 612.18µs | +64.7% |  | 371.58µs | 830.44µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 4.878ms | +47.1% |  | 2.630ms | 10.511ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 123.32µs | +29.2% |  | 83.88µs | 123.32µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 245.51µs | +21.9% |  | 184.69µs | 261.67µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.890ms | +38.7% |  | 1.226ms | 1.890ms | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 8.68µs | +24.2% |  | 6.55µs | 8.68µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 20.39µs | +37.1% |  | 14.21µs | 20.60µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 167.78µs | +57.2% |  | 102.78µs | 175.47µs | 20 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 234.33µs | +28.0% | -21.1% ⚠︎ | 168.27µs | 246.23µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 585.85µs | +51.3% | -63.6% ⚠︎ | 360.32µs | 643.26µs | 31 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 4.787ms | +67.5% | -89.6% ⚠︎ | 2.568ms | 18.547ms | 31 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 141.86µs | +1.1% |  | 113.03µs | 165.76µs | 15 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.264ms | -0.5% |  | 1.028ms | 1.471ms | 15 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 644.43µs | -0.8% |  | 519.49µs | 745.85µs | 15 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 156.49µs | -33.8% |  | 139.99µs | 273.39µs | 15 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.373ms | -33.3% |  | 1.225ms | 2.357ms | 15 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 700.02µs | -32.9% |  | 622.90µs | 1.202ms | 15 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 188.74µs | +31.5% |  | 135.97µs | 188.74µs | 15 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 13.992ms | +5.0% |  | 11.650ms | 14.005ms | 15 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 488.478ms | +49.3% |  | 304.987ms | 488.478ms | 15 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 105.85µs | -49.9% | -45.4% ⚠︎ | 105.85µs | 242.44µs | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 956.50µs | -45.9% | -42.0% ⚠︎ | 931.46µs | 2.003ms | 31 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 464.48µs | -48.1% | -45.6% ⚠︎ | 464.48µs | 1.028ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.621ms | +8.4% | -3.8% | 1.470ms | 2.102ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.684ms | +13.0% | +1.2% | 1.488ms | 2.023ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.544ms | +7.7% | -4.4% | 1.414ms | 1.970ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.502ms | +4.5% | +6.8% | 1.383ms | 1.733ms | 31 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 1.020ms | +14.9% | +12.8% ⚠︎ | 860.59µs | 1.091ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.483ms | +5.5% | -0.7% | 1.337ms | 1.679ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.526ms | +11.7% | +4.9% | 1.309ms | 1.630ms | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 118.91µs | -4.5% | -35.7% ⚠︎ | 111.55µs | 210.75µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 64.07µs | +2.8% | +6.6% | 60.27µs | 74.62µs | 31 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 761.64µs | +5.8% | -3.7% | 693.26µs | 860.28µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 846.77µs | +14.2% | +19.4% ⚠︎ | 703.37µs | 905.34µs | 31 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 877.24µs | +16.7% | +25.6% ⚠︎ | 706.37µs | 946.43µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.94µs | +1.1% | -38.1% ⚠︎ | 20.95µs | 43.78µs | 31 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.36µs | +1.7% | -96.4% ⚠︎ | 21.05µs | 705.55µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 34.51µs | +0.4% | +2.3% | 32.09µs | 40.22µs | 31 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 679.29µs | +5.4% | +13.0% ⚠︎ | 598.94µs | 738.84µs | 31 |

informational; points come from different runners of the same class, so read trends, not single deltas.
