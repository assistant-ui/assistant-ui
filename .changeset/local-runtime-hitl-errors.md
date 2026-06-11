---
"@assistant-ui/core": patch
---

feat: support tool approvals on the local runtime

`LocalRuntime.respondToToolApproval` previously threw "Local runtime does not support tool approvals". the local runtime now implements the approval gate natively, treating the `ChatModelAdapter` as the server side of the protocol: the adapter emits `approval: { id }` on a tool call part and ends the run with `requires-action`. a pending approval pauses the run (previously `shouldContinue` ignored approvals, so an unlisted tool call carrying one re-invoked the adapter in a loop). denying records the decision and synthesizes an error result (`{ error: reason || "Tool approval denied" }` with `isError: true`, matching the AI SDK v6 denial shape); approving records the decision and resumes the run once every gate on the message is decided, with the decisions readable via `unstable_getMessage()`. tool calls carrying an approval are exempt from the `unstable_humanToolNames` result requirement, and a gated call that receives a result via `addToolResult` counts as resolved, so neither combination deadlocks.

resumed runs (from `respondToToolApproval` and `addToolResult` alike) now go through the same run loop as `startRun`: they continue multi-step turns instead of stalling after one roundtrip, emit `runStart`/`runEnd` events, mark the message queue busy so a concurrent send no longer aborts the in-flight roundtrip, and regenerate suggestions on completion. `addToolResult` also notifies subscribers when it records a result without resuming. `resumeToolCall` still throws, now with an error that points at the supported alternatives, and the `unstable_humanToolNames` JSDoc no longer describes the pause as an approval (#4339).
