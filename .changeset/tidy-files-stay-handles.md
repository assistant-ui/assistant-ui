---
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/core": patch
---

Send file parts with `sourceType: "id"` as AG-UI file sources instead of inline bytes, preserving provider handles through snapshot round trips. A file source in a `MESSAGES_SNAPSHOT` user message now also imports as an attachment, so the handle stays visible in the thread.
