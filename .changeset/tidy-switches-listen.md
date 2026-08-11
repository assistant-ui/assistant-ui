---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
---

fix: deliver `threadListItem.switchedTo` to default-scope listeners (#5699). the thread list item client now emits the switch from its own observed selection transition, after the flush that rebinds the derived scopes, instead of relaying the runtime's synchronous notification. scoped listeners now resolve their scope against the host's current client at delivery time, so a listener subscribed before a structural swap follows the scope's present binding; the notification manager re-reads the listener set at flush time per the documented live-set semantics. listeners that need a pinned instance subscribe on an id-scoped client instead.
