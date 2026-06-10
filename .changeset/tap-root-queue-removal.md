---
"@assistant-ui/tap": patch
---

refactor: tap-scheduled roots apply updates directly to cells instead of holding a separate pending-callback queue. Dispatches now apply immediately and the scheduler only batches the re-render; commitRoot keeps cells with unprocessed entries dirty so updates dispatched during a commit survive until the next render.
