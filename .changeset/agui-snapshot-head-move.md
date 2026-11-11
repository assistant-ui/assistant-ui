---
"@assistant-ui/react-ag-ui": patch
---

Route AG-UI events to the assistant message they name after a messages snapshot moves the head, so later text, tool calls, results, and sub-agent output stay on the earlier answer, and an answer cut off by a disconnect settles as incomplete.
