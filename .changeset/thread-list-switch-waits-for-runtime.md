---
"@assistant-ui/core": patch
---

Wait for a replacement thread runtime to attach before a thread switch settles. A switch still pending when the thread list is destroyed now rejects with a silent `ThreadListDestroyedError`, and a switch whose replacement runtime fails to mount rejects with the mount error.
