---
"@assistant-ui/core": patch
---

Reject a remote thread mutation that was cancelled or already run, so it cannot overlap the next queued mutation.
