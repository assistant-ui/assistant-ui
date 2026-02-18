---
"@assistant-ui/react": patch
---

Fix rewritten streaming tool arguments in assistant transport by safely restarting tool-call arg streams without crashing, preserving logical tool call IDs, and preventing stale status cleanup after reset.
