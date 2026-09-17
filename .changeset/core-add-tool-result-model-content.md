---
"@assistant-ui/core": patch
---

fix(core): preserve tool result modelContent and stored artifact in addToolResult

`MessagePartRuntime.addToolResult` dropped a `ToolResponse`'s `modelContent`, so the model-facing content a client-side tool returned never reached the runtime — every runtime read through the public API lost it, while the external-store and assistant-transport paths already forwarded it. It now forwards `modelContent`. `LocalThreadRuntimeCore.addToolResult` also never stored `modelContent` and spread `artifact` unconditionally, so a later result that omitted the artifact overwrote a stored one with `undefined`. It now stores `modelContent` and only overrides `artifact`/`modelContent` when they are supplied.
