---
"@assistant-ui/react-ai-sdk": patch
---

fix: don't abort the whole history load when a stored row fails to convert. `toExportedMessageRepository` now drops a row whose `content` can't be decoded to a valid message (e.g. a hand-seeded `{ "foo": "bar" }` with no `role`), along with any descendants that referenced it, and discards a `headId` that points at a dropped row. previously a single bad row emitted an `undefined` message (or left a dangling `parentId` / `headId`) that threw `Cannot read properties of undefined (reading 'id')` or `Parent message not found` during `thread.import`, taking down the entire thread. the rest of the thread now loads, matching how the cloud adapter filters out rows it can't decode rather than throwing.
