---
"assistant-cloud": patch
---

fix: thread and message responses are now decoded to match their published types

- timestamps are real `Date` objects (previously raw strings at runtime)
- `threads.get()` returns the thread (previously the raw `{ thread }` envelope)
- malformed responses now throw instead of passing through
