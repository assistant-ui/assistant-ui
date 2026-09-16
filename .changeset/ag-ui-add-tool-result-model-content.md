---
"@assistant-ui/react-ag-ui": patch
---

fix(react-ag-ui): preserve tool result modelContent and stored artifact in addToolResult

`AgUiThreadRuntimeCore.addToolResult` never stored a tool result's `modelContent` and spread `artifact` unconditionally. Its outbound conversion (`emitToolResult`) already prefers `modelContent` over the UI result, so a frontend tool's model-facing content was dropped one step before the code that would have sent it to the agent, and a later result that omitted the artifact overwrote a stored one with `undefined`. It now stores `modelContent` and only overrides `artifact`/`modelContent` when supplied — matching the core `addToolResult` fix.
