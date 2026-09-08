---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

fix: read a backtick run as a fence only when it starts a line, so an info string no longer closes a fenced block
