---
"@assistant-ui/react": patch
---

feat: add queue.clear callback, route thread.append through queue

- Add `clear(reason: "edit" | "reload" | "cancel-run")` to `ExternalThreadQueueAdapter`
- `thread.append()` now routes through `queue.enqueue` when a queue adapter is present
- Cancel, edit, and reload operations call `queue.clear` with the appropriate reason
