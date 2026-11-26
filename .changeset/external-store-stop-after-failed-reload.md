---
"@assistant-ui/core": patch
---

Pressing Stop on a new message sent after a failed reload no longer brings back the answer the reload replaced. The thread goes back to the message before the stopped one, and `setMessages` no longer writes the discarded answer back to the host.
