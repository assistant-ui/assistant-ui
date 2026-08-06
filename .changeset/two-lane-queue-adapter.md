---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Reshape `ExternalThreadQueueAdapter` into the two-lane, placement-aware queue surface: `steerItems`, `enqueue(message, { lane })`, `move(queueItemId, { lane?, insertAfter?, insertBefore? })`, and `edit(queueItemId, message)`. `steer(queueItemId)`, `clear(reason)`, and the `{ steer: boolean }` enqueue option are removed from the adapter, and runtimes no longer auto-clear the queue on edit, reload, or cancel — queue policy is host-owned.

Migration for adapter implementers: handle `enqueue(message, { lane: "steer" })` instead of `{ steer: true }`, implement `steerItems`/`move`/`edit`, and apply any clear-on-edit/reload/cancel policy in your host code.

Deprecated, removal after 2026-11-05:

- `QueueItemMethods.steer()` and `ComposerRuntime.steerQueueItem()` — use `move(queueItemId, { lane: "steer" })`.
- `QueueItemState.prompt` — derive from the text parts of `parts`.
- Local runtime `unstable_queueClearOnRewind` / `unstable_queueClearOnCancel` (both default `true`, preserving today's auto-clear). After removal, the queue always survives edits, and cancelling a run pauses the queue and keeps the pending items — the next send drains them.
