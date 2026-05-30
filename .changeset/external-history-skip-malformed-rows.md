---
"@assistant-ui/react-ai-sdk": patch
---

fix: don't abort the whole history load when a single stored row fails to convert. `toExportedMessageRepository` now skips a row whose `content` can't be decoded to a valid message (e.g. a hand-seeded `{ "foo": "bar" }` with no `role`) instead of emitting an `undefined` message that throws `Cannot read properties of undefined (reading 'id')` during `thread.import`. the unconvertible row is dropped (the existing `Unsupported message role` warning still fires) and the rest of the thread loads, matching the cloud adapter's "filter, don't throw" load behavior.
