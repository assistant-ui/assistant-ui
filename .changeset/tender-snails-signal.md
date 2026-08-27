---
"create-assistant-ui": patch
---

fix: propagate termination signals to the spawned CLI. cancelling now exits by the signal (130 for `SIGINT`, 143 for `SIGTERM`) instead of reporting success, so a cancelled scaffold no longer looks like a completed one to CI.
