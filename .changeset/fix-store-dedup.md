---
"@assistant-ui/store": patch
---

Move `@assistant-ui/core` and `@assistant-ui/tap` to peerDependencies to prevent npm from installing duplicate copies of these singleton packages.
