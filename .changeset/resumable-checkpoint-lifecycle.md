---
"@assistant-ui/ai-sdk": patch
---

Report automatic reconnect errors exposed through the AI SDK's `Chat.error`, invoke `onResumeError`, and clear only the failed checkpoint. A replacement checkpoint remains intact if the callback starts another run. Errors from a subsequent send or resume are not attributed to a completed reconnect.

Clear matching checkpoints on reconnect HTTP 204/404 responses. Track reconnect ownership so delayed responses and finish events cannot replace or clear a newer checkpoint. Internal ownership headers are removed before the network request.
