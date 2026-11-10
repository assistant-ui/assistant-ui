---
"@assistant-ui/react-ag-ui": patch
---

Keep streaming into an answer whose text frame is still open when a messages snapshot moves the head, instead of dropping the rest of that frame's deltas.
