---
"@assistant-ui/core": patch
---

fix: export parent messages before their children

a thread whose message was reparented (`addOrUpdateMessage` with a new parent) exported in map insertion order, so a parent could be emitted after its own child. importing that export threw `Parent message not found`, and consumers that resolve each item's parent as they walk the exported array (`exportExternalState`, the external-store `messageRepository` prop) attached messages to the wrong parent. the export now walks the tree in pre-order, which also emits siblings in branch order, so branch positions survive a round-trip.
