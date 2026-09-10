---
"@assistant-ui/core": patch
---

fix: restore and pause queued messages after synchronous dispatch failures

Failed work is retried before later sends. The next explicit send resumes draining; editing or removing an item does not resume a paused queue. Work already accepted by a driver is not restored, and a failed move returns its item to the original position.
