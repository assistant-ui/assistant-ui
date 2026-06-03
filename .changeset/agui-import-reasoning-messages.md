---
"@assistant-ui/react-ag-ui": patch
---

fix: import AG-UI `reasoning` messages from `MESSAGES_SNAPSHOT`

`fromAgUiMessages` only branched on `tool`/`assistant`/`user`/`system`, so
`reasoning` messages in a `MESSAGES_SNAPSHOT` were silently dropped on cold
reload even though the live `REASONING_*` (and deprecated `THINKING_*`) path
already surfaces them. They are now converted faithfully to a `reasoning`
assistant part. `activity` messages carry a structured payload with no
assistant-ui message-part equivalent and remain intentionally unmapped.
