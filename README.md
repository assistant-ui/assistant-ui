## aui-perf nightly record

_40 points · 2026-09-03T05:27:14.273Z to 2026-10-12T04:50:15.622Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 601.54µs | +0.2% | +0.3% | 592.10µs | 700.65µs | 30 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 684.96µs | +1.3% | +1.9% | 665.78µs | 804.46µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 33.39µs | +0.7% | -1.3% | 32.52µs | 39.98µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 374.33µs | +1.9% | -1.6% | 359.60µs | 444.94µs | 30 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.864ms | +2.3% | -0.7% | 5.607ms | 6.875ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 157.37µs | +1.6% | -4.8% | 152.78µs | 185.70µs | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.447ms | +1.4% | -3.6% | 1.375ms | 1.707ms | 30 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.768ms | +0.9% | -4.1% | 5.570ms | 6.838ms | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.55µs | -1.2% | +0.2% | 6.52µs | 7.88µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 52.83µs | -3.0% | -3.4% | 52.72µs | 61.40µs | 30 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 208.74µs | -2.9% | -1.9% | 201.64µs | 246.32µs | 30 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 10 static tools | 34.93µs |  |  | 34.14µs | 40.61µs | 7 |
| ai-sdk-toolkit › ai-sdk: convert fresh AISDKToolkit schemas › 100 static tools | 340.53µs |  |  | 328.87µs | 398.81µs | 7 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 10 static tools | 4.66µs |  |  | 4.27µs | 5.09µs | 7 |
| ai-sdk-toolkit › ai-sdk: reuse converted AISDKToolkit schemas › 100 static tools | 37.79µs |  |  | 35.19µs | 40.83µs | 7 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 530.06µs | +4.4% | +8.6% | 487.10µs | 624.45µs | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.731ms | +2.9% | +6.7% | 4.470ms | 5.608ms | 30 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.681ms | +2.3% | +7.0% | 17.736ms | 22.665ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 335.37µs | +3.2% | +4.6% | 291.94µs | 389.68µs | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 3.059ms | +1.0% | +4.1% | 2.715ms | 3.727ms | 30 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.239ms | +1.8% | +4.5% | 10.803ms | 14.951ms | 30 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 27.58µs | +15.2% | +15.0% ⚠︎ | 23.84µs | 28.91µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 308.60µs | +20.2% | +21.1% ⚠︎ | 249.56µs | 330.30µs | 30 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.687ms | +20.5% | +21.7% ⚠︎ | 1.384ms | 1.740ms | 30 |
| external-message-conversion › core: external message tool results › 100 matches | 33.46µs | -0.2% | +19.7% ⚠︎ | 27.25µs | 39.67µs | 30 |
| external-message-conversion › core: external message tool results › 1000 matches | 339.16µs | -0.3% | +19.3% ⚠︎ | 274.56µs | 404.10µs | 30 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.792ms | -3.8% | +17.9% ⚠︎ | 1.515ms | 2.169ms | 30 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 19.83µs | -0.8% | +1.5% | 17.93µs | 23.98µs | 30 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 199.29µs | +1.7% | +10.4% ⚠︎ | 174.51µs | 230.06µs | 30 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 1.070ms | +1.4% | +8.6% | 975.63µs | 1.304ms | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | +2.5% | -5.0% | 0.10µs | 0.12µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.19µs | +0.4% | +4.8% | 0.17µs | 0.22µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.15µs | -1.6% | +7.1% | 0.99µs | 1.40µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.34µs | -1.1% | +2.7% | 0.30µs | 0.41µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.65µs | -2.4% | +2.4% | 1.58µs | 2.10µs | 30 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.82µs | -1.3% | +3.4% | 14.02µs | 19.26µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.81µs | -3.5% | -0.7% | 70.58µs | 86.70µs | 30 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 475.62µs | +0.3% | +2.5% | 447.91µs | 596.48µs | 30 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 tilde runs on one line | 1.495ms |  |  | 1.495ms | 1.495ms | 1 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 20,000 triple-backtick spans on one line | 1.450ms |  |  | 1.450ms | 1.450ms | 1 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, 5,000 code spans in one paragraph | 221.93µs |  |  | 221.93µs | 221.93µs | 1 |
| markdown-preprocess › react-markdown: preprocess › escapeCurrencyDollars, mixed message, 100 sections | 295.45µs |  |  | 295.45µs | 295.45µs | 1 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 tilde runs on one line | 3.257ms |  |  | 3.257ms | 3.257ms | 1 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 20,000 triple-backtick spans on one line | 9.665ms |  |  | 9.665ms | 9.665ms | 1 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, 5,000 code spans in one paragraph | 1.541ms |  |  | 1.541ms | 1.541ms | 1 |
| markdown-preprocess › react-markdown: preprocess › normalizeMathDelimiters, mixed message, 100 sections | 1.048ms |  |  | 1.048ms | 1.048ms | 1 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown | 1.053ms |  |  | 1.018ms | 1.222ms | 6 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 10 KB fenced Markdown deferred | 1.429ms |  |  | 1.371ms | 1.499ms | 6 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown | 7.605ms |  |  | 7.336ms | 8.816ms | 6 |
| markdown-streaming › react-markdown: one token after an unchanged fenced code block › 100 KB fenced Markdown deferred | 8.680ms |  |  | 8.670ms | 10.017ms | 6 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 511.79µs | +1.7% | -4.9% | 371.23µs | 730.11µs | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.027ms | +0.5% | -1.9% | 1.021ms | 1.222ms | 30 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.176ms | -1.7% | -0.6% | 4.007ms | 5.227ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.127ms | -0.0% | +1.2% | 1.095ms | 1.180ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.061ms | +0.5% | -0.8% | 1.041ms | 1.178ms | 30 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 3.172ms | +24.3% | -8.8% | 2.210ms | 3.172ms | 30 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 1000 character argument in 16-character deltas | 115.45µs |  |  | 100.23µs | 152.70µs | 7 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 10000 character argument in 16-character deltas | 1.074ms |  |  | 944.27µs | 1.368ms | 7 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 500 short object entries in 16-character deltas | 161.349ms |  |  | 115.889ms | 167.624ms | 7 |
| react-langgraph › react-langgraph: streamed tool argument accumulation › 50000 character argument in 16-character deltas | 5.321ms |  |  | 4.707ms | 6.895ms | 7 |
| react-pi-message-projection › react-pi: streaming tail projection › 10 stable messages | 1.00µs |  |  | 0.99µs | 1.19µs | 7 |
| react-pi-message-projection › react-pi: streaming tail projection › 1000 stable messages | 5.62µs |  |  | 5.62µs | 5.96µs | 7 |
| react-pi-message-projection › react-pi: streaming tail projection › 5000 stable messages | 19.59µs |  |  | 17.45µs | 22.73µs | 7 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.59µs | +2.8% |  | 2.51µs | 3.21µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 10.54µs | -2.2% |  | 10.04µs | 13.96µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.82µs | +2.0% |  | 24.32µs | 30.73µs | 30 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 226.97µs | -1.1% |  | 206.12µs | 287.79µs | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.990ms | +5.8% | +8.2% | 1.549ms | 2.615ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 13.202ms | +10.2% | +15.6% ⚠︎ | 11.705ms | 16.358ms | 30 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 207.583ms | +13.0% | +18.6% ⚠︎ | 150.737ms | 240.613ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 10 messages | 200.35µs | +0.3% |  | 197.56µs | 268.00µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 100 messages | 338.09µs | -4.3% |  | 327.73µs | 473.00µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › 20 message window, 1000 messages | 1.691ms | +13.1% |  | 1.495ms | 2.207ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 10 messages | 194.25µs | -3.5% |  | 187.05µs | 283.34µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 100 messages | 540.80µs | -32.4% |  | 528.14µs | 976.95µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages by id, 1000 messages | 4.764ms | -54.8% |  | 4.475ms | 12.620ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 10 messages | 172.69µs | -7.4% |  | 171.55µs | 267.92µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 100 messages | 394.07µs | -36.8% |  | 385.75µs | 830.44µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › all messages, 1000 messages | 2.679ms | -57.9% |  | 2.630ms | 10.511ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 10 messages | 94.14µs | +12.2% |  | 83.88µs | 111.41µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 100 messages | 186.52µs | -0.5% |  | 184.69µs | 235.11µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › provider only, 1000 messages | 1.293ms | -1.3% |  | 1.226ms | 1.624ms | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 10 messages | 6.83µs | +4.3% |  | 6.55µs | 7.89µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 100 messages | 14.52µs | -0.2% |  | 14.21µs | 17.62µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by layer › runtime only, 1000 messages | 102.78µs | -2.8% |  | 102.78µs | 128.33µs | 11 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 192.10µs | +3.7% | -34.0% ⚠︎ | 168.27µs | 378.51µs | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 392.93µs | -24.9% | -75.1% ⚠︎ | 374.00µs | 1.779ms | 30 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 2.568ms | -57.4% | -93.5% ⚠︎ | 2.568ms | 54.890ms | 30 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 1000 bytes | 134.67µs |  |  | 134.67µs | 165.76µs | 6 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 10000 bytes | 1.227ms |  |  | 1.226ms | 1.471ms | 6 |
| tool-args › assistant-stream: accumulator tool arguments (16-char deltas) › 5000 bytes | 613.38µs |  |  | 613.38µs | 745.85µs | 6 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 1000 bytes | 223.89µs |  |  | 223.89µs | 273.39µs | 6 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 10000 bytes | 1.949ms |  |  | 1.949ms | 2.357ms | 6 |
| tool-args › assistant-stream: active-reader tool arguments (16-char deltas) › 5000 bytes | 986.53µs |  |  | 986.53µs | 1.202ms | 6 |
| tool-args › assistant-stream: complete accumulated arguments (single delta) › 10,000 array elements | 140.93µs |  |  | 140.93µs | 166.92µs | 6 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 array entries | 12.360ms |  |  | 12.360ms | 14.005ms | 6 |
| tool-args › assistant-stream: dense accumulated arguments (16-char deltas) › 2,000 object entries | 307.789ms |  |  | 307.789ms | 360.804ms | 6 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 201.87µs | -1.7% | +1.4% | 178.72µs | 242.44µs | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.645ms | -3.1% | +0.6% | 1.531ms | 2.003ms | 30 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 854.90µs | -3.0% | +0.9% | 782.04µs | 1.028ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.535ms | +1.2% | -10.5% ⚠︎ | 1.470ms | 2.102ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.547ms | +0.2% | -7.0% | 1.488ms | 2.023ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.491ms | +0.5% | -9.4% | 1.414ms | 1.970ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.450ms | +4.8% | +2.3% | 1.383ms | 1.733ms | 30 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 891.78µs | +3.6% | -2.1% | 860.59µs | 1.091ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.413ms | +5.6% | -2.6% | 1.337ms | 1.662ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.376ms | +2.1% | -5.4% | 1.330ms | 1.608ms | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 117.66µs | -1.6% | -32.6% ⚠︎ | 111.55µs | 210.75µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 63.90µs | +3.6% | +3.4% | 60.09µs | 73.56µs | 30 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 747.89µs | +7.9% | -1.8% | 693.26µs | 857.20µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 769.66µs | -0.1% | +10.8% ⚠︎ | 689.02µs | 876.92µs | 30 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 774.22µs | +0.9% | +8.0% | 693.05µs | 902.68µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 21.76µs | -37.0% | -40.5% ⚠︎ | 20.95µs | 43.78µs | 30 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 22.23µs | -96.4% | -96.3% ⚠︎ | 21.26µs | 705.55µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 35.41µs | +9.9% | +7.5% | 32.09µs | 40.22µs | 30 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 671.56µs | +9.1% | +13.1% ⚠︎ | 594.79µs | 716.76µs | 30 |

informational; points come from different runners of the same class, so read trends, not single deltas.
