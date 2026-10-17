---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
---

fix: preserve AI SDK history messages listed before their parents by sharing core's parent-first ordering helper. Keep the selected head and sibling branches while continuing to skip malformed messages and orphaned descendants.
