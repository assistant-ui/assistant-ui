---
"@assistant-ui/core": patch
---

fix: restore and pause queued messages after synchronous dispatch failures

Failed work is retried before later sends. Work already accepted by a driver is not restored, and a failed move returns its item to the original position.
