---
"@assistant-ui/react-ag-ui": patch
---

feat(react-ag-ui): tighten interrupt lifecycle

`append`, `reload`, and `resume` now refuse to start a new run while interrupts are still pending on the thread; the call throws with a message pointing at `submitInterruptResponses` instead of letting the request hit the wire and rely on the agent to reject it (AG-UI interrupts spec rule 4).

`AgUiInterrupt.reason` is typed as `AgUiInterruptReason` (`"tool_call" | "input_required" | "confirmation" | (string & {})`), so the spec values autocomplete while string extension stays open.

`onRunFinishedEvent` now ignores payloads that parse as a different event type, so a misrouted callback can no longer suppress the `onRunFinalized` fallback.
