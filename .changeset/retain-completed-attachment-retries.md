---
"@assistant-ui/core": patch
---

fix: reuse successful attachment uploads after a sibling fails in both runtime and ExternalThread composers, while preserving cleanup when the unsent draft is discarded.
