---
"@assistant-ui/core": patch
---

`addToolResult` on the local runtime now stores the result on the open tool call when a settled call earlier in the same assistant message has the same `toolCallId`, as providers that number calls per step produce. Before, it overwrote every call with that id, so the earlier call showed and sent the new result, and the history adapter persisted it.
