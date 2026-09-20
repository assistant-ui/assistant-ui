## aui-perf nightly record

_18 points · 2026-09-03T05:27:14.273Z to 2026-09-20T04:38:02.016Z · latest runner: AMD EPYC · Node v24.21.0_

| bench | latest | Δ7d | Δ30d | min | max | points |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 chunks from one source stream | 601.51µs | +1.6% |  | 592.10µs | 644.55µs | 9 |
| accumulator › assistant-stream: raw controller enqueue overhead › 10,000 controller.enqueue calls | 698.27µs | +3.6% |  | 668.74µs | 727.09µs | 9 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 16 deltas × 250 chars | 32.93µs | -1.2% |  | 32.64µs | 42.08µs | 18 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 250 deltas × 16 chars | 371.17µs | -1.1% |  | 359.60µs | 471.76µs | 18 |
| accumulator › assistant-stream: same 4000-char text, chunk size A/B › 4000 deltas × 1 char (per-token) | 5.787ms | -0.9% |  | 5.607ms | 7.384ms | 18 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 100 deltas | 154.58µs | -0.2% |  | 152.78µs | 208.89µs | 18 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 1000 deltas | 1.429ms | -1.7% |  | 1.409ms | 1.897ms | 18 |
| accumulator › assistant-stream: stream + accumulator per-delta cost (16-char deltas) › 4000 deltas | 5.675ms | -1.9% |  | 5.633ms | 7.535ms | 18 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 100 deltas | 6.58µs | +0.4% |  | 6.47µs | 7.65µs | 18 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 1000 deltas | 53.41µs | +1.3% |  | 52.55µs | 59.72µs | 18 |
| accumulator › assistant-stream: stream round trip baseline, no accumulator › 4000 deltas | 210.55µs | +1.4% |  | 201.64µs | 235.90µs | 18 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 100 deltas | 517.05µs | +6.1% |  | 487.10µs | 654.19µs | 18 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 1000 deltas | 4.687ms | +4.9% |  | 4.434ms | 6.076ms | 18 |
| data-stream › assistant-stream: data stream decode (16-char deltas) › 4000 deltas | 18.710ms | +5.4% |  | 17.461ms | 24.024ms | 18 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 100 deltas | 313.14µs | -1.7% |  | 291.94µs | 495.40µs | 18 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 1000 deltas | 2.957ms | -1.0% |  | 2.715ms | 4.316ms | 18 |
| data-stream › assistant-stream: data stream encode (16-char deltas) › 4000 deltas | 12.011ms | -0.4% |  | 10.803ms | 17.276ms | 18 |
| external-message-conversion › core: external message reasoning continuations › 100 matches | 24.06µs | +0.9% |  | 23.84µs | 27.35µs | 9 |
| external-message-conversion › core: external message reasoning continuations › 1000 matches | 260.08µs | +0.6% |  | 249.56µs | 291.82µs | 9 |
| external-message-conversion › core: external message reasoning continuations › 5000 matches | 1.399ms | +1.1% |  | 1.384ms | 1.564ms | 9 |
| external-message-conversion › core: external message tool results › 100 matches | 27.63µs | -0.0% |  | 27.25µs | 32.99µs | 9 |
| external-message-conversion › core: external message tool results › 1000 matches | 283.86µs | +1.3% |  | 274.56µs | 331.32µs | 9 |
| external-message-conversion › core: external message tool results › 5000 matches | 1.545ms | +2.0% |  | 1.515ms | 1.830ms | 9 |
| external-message-conversion › core: external message unique tool calls › 100 matches | 18.57µs | +3.6% |  | 17.93µs | 22.45µs | 9 |
| external-message-conversion › core: external message unique tool calls › 1000 matches | 179.32µs | +2.6% |  | 174.80µs | 214.95µs | 9 |
| external-message-conversion › core: external message unique tool calls › 5000 matches | 991.39µs | +1.6% |  | 975.63µs | 1.228ms | 9 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 1 text parts | 0.10µs | +1.9% |  | 0.10µs | 0.12µs | 18 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 10 text parts | 0.17µs | -3.0% |  | 0.17µs | 0.21µs | 18 |
| from-thread-message-like › core: fromThreadMessageLike text parts › 100 text parts | 1.06µs | +1.0% |  | 0.99µs | 1.21µs | 18 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 1 tool calls | 0.33µs | -0.5% |  | 0.30µs | 0.38µs | 18 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 10 tool calls | 1.58µs | -3.8% |  | 1.58µs | 1.97µs | 18 |
| from-thread-message-like › core: fromThreadMessageLike tool calls › 100 tool calls | 14.02µs | -3.6% |  | 14.02µs | 17.76µs | 18 |
| interactable-array-patches › core: id-keyed interactable array patches › 1000 items and patches | 73.68µs | +0.7% |  | 72.20µs | 78.05µs | 10 |
| interactable-array-patches › core: id-keyed interactable array patches › 5000 items and patches | 472.23µs | -0.2% |  | 452.51µs | 520.29µs | 10 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 1 paragraphs | 402.45µs | -0.1% |  | 400.48µs | 712.00µs | 18 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 10 paragraphs | 1.058ms | -0.4% |  | 1.035ms | 1.222ms | 18 |
| markdown-streaming › react-markdown: one token changed in the last paragraph, by message length › 50 paragraphs | 4.029ms | +0.4% |  | 4.013ms | 5.103ms | 18 |
| markdown-streaming › react-markdown: the same token with defer on › 1 paragraphs deferred | 1.134ms | +0.2% |  | 1.097ms | 1.156ms | 17 |
| markdown-streaming › react-markdown: the same token with defer on › 10 paragraphs deferred | 1.056ms | -0.3% |  | 1.049ms | 1.142ms | 17 |
| markdown-streaming › react-markdown: the same token with defer on › 50 paragraphs deferred | 2.935ms | +7.7% |  | 2.356ms | 3.478ms | 17 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 1 chunks | 2.52µs | -1.3% |  | 2.52µs | 3.12µs | 8 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 100 KiB, 101 chunks | 11.19µs | -2.3% |  | 10.92µs | 12.41µs | 8 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1 chunks | 24.38µs | -6.0% |  | 24.38µs | 30.43µs | 8 |
| sse-fragmentation › assistant-stream: fragmented SSE events › 1024 KiB, 1025 chunks | 223.28µs | +8.3% |  | 206.12µs | 286.06µs | 8 |
| thread-scaling › external-store thread: mount+unmount by message count › 10 messages | 1.551ms | -2.0% |  | 1.549ms | 2.309ms | 18 |
| thread-scaling › external-store thread: mount+unmount by message count › 100 messages | 12.099ms | +2.8% |  | 11.058ms | 14.062ms | 18 |
| thread-scaling › external-store thread: mount+unmount by message count › 1000 messages | 174.057ms | +0.2% |  | 150.737ms | 219.705ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 10 messages | 297.15µs | +4.7% |  | 265.63µs | 378.51µs | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 100 messages | 1.609ms | +0.2% |  | 1.517ms | 1.812ms | 18 |
| thread-scaling › external-store thread: one token changed in the last message, by thread length › 1000 messages | 46.080ms | -6.3% |  | 35.328ms | 54.890ms | 18 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 1000 bytes | 193.70µs | -3.1% |  | 178.72µs | 208.88µs | 11 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 10000 bytes | 1.648ms | -3.8% |  | 1.531ms | 1.780ms | 11 |
| tool-args › assistant-stream: execute-only tool arguments (16-char deltas) › 5000 bytes | 853.09µs | -0.9% |  | 782.04µs | 919.07µs | 11 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRoot | 1.686ms | +2.8% |  | 1.582ms | 2.011ms | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootDeps | 1.665ms | +5.0% |  | 1.558ms | 2.017ms | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › createTapRootStable | 1.616ms | +4.7% |  | 1.497ms | 1.928ms | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › react | 1.407ms | -0.9% |  | 1.403ms | 1.703ms | 18 |
| tree › tree mount+unmount, 500 leaves x 10 hooks › tapRoot | 904.05µs | +0.3% |  | 876.38µs | 1.056ms | 18 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRoot | 1.493ms | +4.0% |  | 1.387ms | 1.756ms | 18 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootDeps | 1.455ms | +1.5% |  | 1.384ms | 1.612ms | 18 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › createTapRootStable | 185.05µs | +2.3% |  | 173.75µs | 201.76µs | 18 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › react | 60.09µs | -1.3% |  | 60.09µs | 71.53µs | 18 |
| tree › tree update: one leaf dispatch, 500 leaves x 10 hooks › tapRoot | 790.90µs | +4.3% |  | 731.55µs | 928.53µs | 18 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › deps | 709.08µs | +1.1% |  | 689.02µs | 1.060ms | 18 |
| useResources › useResources mount+unmount, 500 children x 10 hooks › no-deps | 698.49µs | +0.8% |  | 693.05µs | 1.242ms | 18 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › deps | 35.43µs | -0.9% |  | 35.28µs | 89.26µs | 18 |
| useResources › useResources: one child dispatch, 500 children x 10 hooks › no-deps | 624.23µs | +0.4% |  | 589.02µs | 765.54µs | 18 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › deps | 33.71µs | -0.4% |  | 32.95µs | 80.26µs | 18 |
| useResources › useResources: rebuild elements array, 500 children x 10 hooks › no-deps | 601.00µs | +1.0% |  | 586.81µs | 738.13µs | 18 |

informational; points come from different runners of the same class, so read trends, not single deltas.
