---
"@assistant-ui/core": patch
---

Move `@assistant-ui/tap` to peerDependencies to prevent duplicate module installations that break the singleton `AssistantTapContext`. Improved error message when context is missing to help diagnose duplication issues.
