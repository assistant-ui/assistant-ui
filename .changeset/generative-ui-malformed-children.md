---
"@assistant-ui/core": patch
---

fix: Generative UI rendering no longer throws when a node's `children` is not an array; a string or node renders as the only child, and any other value is skipped with the malformed-node warning.
