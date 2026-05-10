---
"@assistant-ui/store": patch
---

fix: guard useAuiState getSnapshot against zombie-child out-of-bounds throws

When the store notifies all subscribers after a thread switch, stale child
components re-run getSnapshot() before React can unmount them. tapClientLookup
throws Index N out of bounds for the now-invalid index. Return the last good
snapshot value instead of throwing so React can cleanly unmount the zombie
child on the next reconciliation pass. Real errors on first render still propagate.
