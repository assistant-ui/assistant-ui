---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: `ModelContext()` takes `maxSystemLength` to cap the merged system prompt, trimming the lowest-priority parts first, or `mergeSystem` to combine the prioritized `SystemPart`s yourself
