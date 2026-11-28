---
"assistant-cloud": patch
---

Adds `threads.runs.open`, which opens a thread's run lease, optionally under the message it answers (Assistant Cloud v0.2.12 or newer). Message lists carry the thread's running lease as `run` (`null` when it has none), and `CloudMessagePersistence.threadRunOf` returns it as the latest load read it. Nothing calls `threads.runs.open` yet.
