---
"@assistant-ui/core": patch
---

chore: mark `generateId` and `fromThreadMessageLike` as experimental

these two utilities became public in #4414. they now carry an `@deprecated` JSDoc noting the API is experimental and may change without notice, matching how the other unstable public utilities (e.g. `bindExternalStoreMessage`) are flagged. the framework packages (`@assistant-ui/react`, `@assistant-ui/react-native`, `@assistant-ui/react-ink`) re-export them, so the same hint shows up there too.
