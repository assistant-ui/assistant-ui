---
"@assistant-ui/core": patch
---

Initialize a thread on the replacement adapter when the thread list adapter changes while its first message is being sent, instead of failing the reply with "Thread list adapter changed while an operation was pending."
