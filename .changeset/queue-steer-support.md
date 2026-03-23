---
"@assistant-ui/react": patch
"@assistant-ui/core": patch
---

feat: add native queue and steer support

- Add `queue` adapter to `ExternalThreadProps` for runtimes that support message queuing
- Add `QueueItemPrimitive.Text`, `.Steer`, `.Remove` primitives for rendering queue items
- Add `ComposerPrimitive.Queue` for rendering the queue list within the composer
- Add `ComposerSendOptions` with `steer` flag to `composer.send()`
- Add `capabilities.queue` to `RuntimeCapabilities`
- `ComposerPrimitive.Send` stays enabled during runs when queue is supported
- Cmd/Ctrl+Shift+Enter hotkey sends with `steer: true` (interrupt current run)
- Add `queueItem` scope to `ScopeRegistry`
- Add `queue` field to `ComposerState` and `queueItem()` method to `ComposerMethods`
