---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add `unstable_getThreadMessageLikePartIndices`, which maps each part `fromThreadMessageLike` keeps back to its index in the `ThreadMessageLike` content, since empty text and reasoning parts are left out
