---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): don't auto-cancel HITL interrupts when user sends a new message

- `useAdkRuntime.onNew` now filters pending tool calls whose id is tracked in `long_running_tool_ids`, so ADK HITL interrupts (`adk_request_input`, `adk_request_confirmation`, `adk_request_credential`) are no longer overwritten with `{cancelled: true}` when the user types a new message
- Add `useAdkSubmitInput(toolCallId, result)` to submit the user's answer as a `{result}` FunctionResponse, matching ADK's `unwrap_response` contract so Workflow `RequestInput` nodes resume with the unwrapped value
- `AdkEventAccumulator` unions `long_running_tool_ids` across events instead of replacing, so multiple HITL interrupts in the same turn are all tracked
- `onEdit` / `onReload` / session load paths now reset derived HITL state (`longRunningToolIds`, `toolConfirmations`, `authRequests`, `escalated`) via a new `replaceMessages` helper on `useAdkMessages`, so stale interrupt markers don't leak into the next turn

**Behavior change:** HITL interrupts must now be answered through a tool UI using the dedicated submit helpers (`useAdkSubmitInput`, `useAdkConfirmTool`, `useAdkSubmitAuth`). Typing in the composer while an interrupt is pending no longer sends a spurious cancellation.
