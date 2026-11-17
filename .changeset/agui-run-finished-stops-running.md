---
"@assistant-ui/react-ag-ui": patch
---

Set `isRunning` to false at `RUN_FINISHED` while the response stays open for server cleanup, unless a continuation is already owed. A send, tool result continuation, interrupt response, or `steerAway` submitted during cleanup waits for the finished response to close on its own before starting another request, with `isRunning` true while waiting. Only the latest waiting send starts a request, carrying all queued user messages. Stop, unmount, and a thread switch still abort the response. Stop leaves an interrupt whose answer was waiting on cleanup answerable.
