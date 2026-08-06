---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

Reshape `ExternalThreadQueueAdapter` into the two-verb, two-lane queue surface: `items`, `steerItems`, `enqueue(message)` (queue lane, in order), `steer(message)` (steer lane, processed next), `move(queueItemId, { insertAfter?, insertBefore? })` (placement within the item's lane), `edit(queueItemId, message)`, and `remove(queueItemId)` — all required. Cross-lane transfer is `remove` + `steer`/`enqueue`. Runtimes no longer auto-clear the queue on edit, reload, or cancel — queue policy is host-owned.

`composer.send()` with `steer` omitted now defaults to steer while a run is in flight; idle sends are unchanged. Pass `send({ steer: false })` to queue behind the pending messages.

Migration for adapter implementers: split `enqueue(message, { lane })` into `enqueue(message)` and `steer(message)`, drop the `lane` option from `move`, and apply any clear-on-edit/reload/cancel policy in your host code.

Deprecated, removal after 2026-11-05:

- `QueueItemMethods.steer()` and `ComposerRuntime.steerQueueItem()` — promotion decomposes to `remove` plus a steer send.
- `QueueItemState.prompt` — derive from the text parts of `parts`.
- Local runtime `unstable_queueClearOnRewind` / `unstable_queueClearOnCancel` (both default `true`, preserving today's auto-clear). After removal, the queue always survives edits, and cancelling a run pauses the queue and keeps the pending items — the next send drains them.
