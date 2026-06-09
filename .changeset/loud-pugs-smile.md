---
"@assistant-ui/react-ag-ui": patch
---

fix: mark the streaming assistant placeholder with `metadata.isOptimistic` so the message repository evicts it after the client→server id swap, instead of leaving a phantom empty sibling branch on every run
