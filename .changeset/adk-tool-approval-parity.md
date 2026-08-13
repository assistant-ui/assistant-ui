---
"@assistant-ui/react-google-adk": patch
---

fix: answer ADK tool confirmations through the core tool-approval seam instead of writing a fabricated tool result, and replay client-supplied tool results when a thread is reloaded

A confirmation is now decided through `onRespondToToolApproval`, and both the synthetic `adk_request_confirmation` call and the call it gates carry that one approval, so answering either replies to the gate ADK resumes on.

Loading a thread also replays the tool results the client supplied — confirmation replies, `useAdkSubmitInput` answers, `useAdkSubmitAuth` credentials, and `onAddToolResult` results. These were previously dropped on reload, so their tool calls came back result-less and re-rendered as `requires-action`.
