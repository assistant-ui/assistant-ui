---
"@assistant-ui/react-ink": patch
---

docs: reword the useNotification JSDoc from "pauses for human approval" to "pauses for user input"; the needs-input trigger fires on `requires-action` with reason `interrupt`, not on tool approval gates
