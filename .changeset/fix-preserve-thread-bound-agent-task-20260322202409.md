---
"@assistant-ui/react-agent": patch
---

fix: preserve thread-bound agent tasks across thread switches

Bind agent tasks to assistant-ui thread IDs, keep workspace-owned tasks alive across detach, and allow the chat bridge to reattach to an active task so per-thread status, approvals, and streaming state stay scoped to the correct thread.
