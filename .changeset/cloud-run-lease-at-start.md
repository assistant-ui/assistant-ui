---
"@assistant-ui/core": patch
---

The Assistant Cloud run tracker opens the thread's run lease when a run starts and stores nothing yet. Its checkpoints (every 20 seconds) store the reply once it has content and update it after, and the runtime's settled write ends the lease, so a run that dies before writing leaves no message. Needs Assistant Cloud v0.2.12 or newer.
