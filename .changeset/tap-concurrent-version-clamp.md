---
"@assistant-ui/tap": patch
---

fix: clamp `setRootVersion` to the committed state instead of throwing when a React concurrent reducer replay passes a version below the last commit, eliminating the recoverable "Version is less than committed version" error during streaming
