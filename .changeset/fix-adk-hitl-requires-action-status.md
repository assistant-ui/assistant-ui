---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): [Google ADK HITL] AdkEventAccumulator blocks requires-action status for longRunningToolIds

`AdkEventAccumulator.processEvent` was stamping a manual `{type: "complete", reason: "stop"}` status on the AI message that carries a HITL interrupt tool call (`adk_request_input` / `adk_request_confirmation` / `adk_request_credential`). That manual status is not an auto-status, so `external-message-converter` refused to promote the message to `AUTO_STATUS_PENDING` ({type: "requires-action"}) — making the `status.type === "requires-action"` branch of any `makeAssistantToolUI` render dead code for HITL interrupts.

The fix adds a `hasHitl` guard: when `isFinalResponse(event)` is true *only* because `longRunningToolIds` is populated, skip the manual status assignment and let auto-status apply `requires-action` downstream.

- Tool UIs registered via `makeAssistantToolUI` for `adk_request_input` can now use the idiomatic `if (status.type === "requires-action") { /* show form */ }` pattern to render an input form during HITL interrupts.
- `useAdkSubmitInput(toolCallId, result)` (added in PR #3800) now has a path to be invoked, because the form that calls it finally renders.
- Non-HITL final events (LLM stop, content-filter, error, `skipSummarization`) still get their manual status — no regression.
- Adds 5 unit tests to `AdkEventAccumulator.test.ts` under `describe("AdkEventAccumulator - HITL requires-action", ...)` locking in the contract, plus updates the existing `"marks as final when longRunningToolIds is non-empty"` test (which previously asserted the buggy `status: {type: "complete"}` behavior) to assert `status === undefined` for HITL events.

**Related:** complements PR #3800 (HITL auto-cancel fix). #3800 protected HITL tool calls from being auto-cancelled on the *next* turn; this fix makes the HITL form render in the *first* place, so users can answer instead of typing into the main composer and getting a `text` event that can't resume the paused `RequestInput` node.
