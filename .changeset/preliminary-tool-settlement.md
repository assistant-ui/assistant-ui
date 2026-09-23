---
"@assistant-ui/core": patch
---

fix(core): settle a tool call only on its final result in the tool tracker, aui/v0 persistence and `addToolResult`

the external store tool tracker settled a call on its first interim result, so a `streamCall` reader resolved with that value and never saw the final one. the aui/v0 encoder dropped `isPreliminary`, so a thread saved while a tool was streaming reloaded with the interim value as its final result. the local runtime's `addToolResult` treated a call holding an interim result as already answered, so the final result neither resumed the run nor persisted the paused message.
