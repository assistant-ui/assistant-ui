---
"@assistant-ui/react-ag-ui": patch
---

Set `isRunning` to false at `RUN_FINISHED` while the response stays open for server cleanup, unless a continuation is already owed. A send, tool result continuation, interrupt response, or `steerAway` submitted during cleanup waits for the finished response to close on its own before starting another request, with `isRunning` true while waiting. Only the latest waiting send starts a request, carrying all queued user messages. Stop still aborts the response. Unmount and a thread switch abort it too, except for an agent that implements `connect()`, which is detached while its run continues on the server. Stop leaves an interrupt whose answer was waiting on cleanup answerable.

Record tool approvals that leave other gates undecided immediately during cleanup, and wait for the response to close only when an approval completes the batch. Reject displaced interrupt responses, completing tool approvals, and `steerAway` calls with the busy error before changing the thread. Name the submitted method in a displaced tool approval's busy error. Carry a deferred A2UI action exactly once in a user request already waiting for cleanup. If no action is waiting and the finished run leaves an interrupt pending, drop the deferred A2UI action.

Handle sequential runs in one response independently, stopping `isRunning` at each `RUN_FINISHED` unless a continuation is already owed, and settling the current run's subagent calls when the response ends without a finish event. Ignore a sequential run in full if its `RUN_STARTED` arrives after an action begins waiting for cleanup, while allowing an already accepted run to finish streaming. Clear `isRunning` when a deferred replay continuation cannot resume because its stored approval is invalid.
