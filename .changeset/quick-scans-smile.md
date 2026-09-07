---
"@assistant-ui/react-streamdown": patch
---

perf: bound the streaming remend window scan to each line, so the boundary pass stays linear in the message instead of scanning the remaining text once per line
