---
"@assistant-ui/react-ag-ui": patch
---

A run rejoined in flight gives its assistant message the agent's id when the message has no content yet, so every client following the run stores one answer.
