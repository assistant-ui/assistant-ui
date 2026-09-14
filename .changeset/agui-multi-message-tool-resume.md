---
"@assistant-ui/react-ag-ui": patch
---

fix: resume after frontend tool results when a run streams a second text message

A run that streamed a second assistant message after an unresolved tool call finalized the first message as complete, which severed the auto-resume continuation: the frontend tool's result never triggered a follow-up run and the conversation stalled. The previous message now keeps `requires-action`/`tool-calls` until its calls resolve, the resume run anchors on the branch head instead of forking off the tool-call message, and the pending-tool-call search, auto-cancel, and steerAway handle every pending owner instead of only the newest. The continuation waits for open interrupt gates and for all pending owners, and history writes defer a child message until its pending parent becomes persistable so the stored graph stays connected.
