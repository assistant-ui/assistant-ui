---
"@assistant-ui/react-a2a": patch
---

fix: keep the server-assigned contextId across re-renders. switching threads aborts the in-flight run and fires onCancel
