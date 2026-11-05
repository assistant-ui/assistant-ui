---
"@assistant-ui/react-ag-ui": patch
---

Store an answered AG-UI interrupt, and a tool result that arrives after its message settled, through the history adapter's `update`, so a reload no longer shows the interrupt as pending again or drops the result.
