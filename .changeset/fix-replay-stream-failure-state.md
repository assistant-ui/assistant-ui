---
"@assistant-ui/core": patch
---

refactor: make the replay boundary stream clear its own replay state on read failures and cancellation, so the transition out of replay mode is balanced with the transition in
