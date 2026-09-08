---
"@assistant-ui/core": patch
---

fix: export parent messages before their children

a thread whose message was reparented (`addOrUpdateMessage` with a new parent) exported in map insertion order, so a parent could be emitted after its own child. importing that export threw `Parent message not found`, and the persistence adapters that skip an item whose parent has not been seen yet silently dropped messages when the thread was reloaded. the export now walks the tree in pre-order, which also emits siblings in branch order, so branch positions survive a round-trip.
