---
"@assistant-ui/core": patch
---

fix: pause an external store's message queue when the user cancels. cancelling left the queue running, so the aborted run's settle dispatched the next pending message at the moment the user pressed Stop; the pending items now survive and the next send drains them, matching what the local runtime does under `unstable_queueClearOnCancel: false` and the behaviour that flag becomes once it is removed.
