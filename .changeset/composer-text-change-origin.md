---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-lexical": patch
"@assistant-ui/vue": patch
---

feat: report every composer text write as a `textChange` event (`composer.textChange` in the store) with the text it left and its origin, so a user clearing the draft can be told apart from a send, a returned send, a reset, or input history recall; `setText` accepts `{ origin }`
