---
"@assistant-ui/core": patch
---

fix(core): a message appended right before a `sendCommand` call reaches the assistant transport server ahead of that command when no client tool is executing
