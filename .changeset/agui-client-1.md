---
"@assistant-ui/react-ag-ui": minor
---

<!-- caret-break: intended -->

run on `@ag-ui/client` 1.0 and drop the legacy event paths it upgrades itself (`THINKING_*`, `TEXT_MESSAGE_CHUNK`, `TOOL_CALL_CHUNK`, untyped events). a `cancelled` run outcome ends the run as cancelled, `pendingToolCallIds` decides which tool calls keep the run waiting, an expired interrupt can still be cancelled, tool results keep content parts, and file source parts survive a history round trip. apps on `@ag-ui/client` 0.0.x stay on `@assistant-ui/react-ag-ui` 0.0.x.
