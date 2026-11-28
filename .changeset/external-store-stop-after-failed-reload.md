---
"@assistant-ui/core": patch
---

Pressing Stop on a message sent or edited after a failed reload no longer brings back the answer the reload replaced. The thread returns to the view from before that message, and `setMessages` no longer writes the discarded answer back to the host.
