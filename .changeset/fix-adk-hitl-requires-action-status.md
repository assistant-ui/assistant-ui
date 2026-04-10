---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): allow HITL interrupt tool UIs to render with `requires-action` status

- `makeAssistantToolUI` for HITL tools (`adk_request_input`, etc.) can now use `status.type === "requires-action"` to render input forms
- Non-HITL final events still receive their manual `complete` status
