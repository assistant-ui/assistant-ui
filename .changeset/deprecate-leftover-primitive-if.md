---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

deprecate leftover Primitive.If and Empty wrappers on react-native and react-ink, and point them at AuiIf

ThreadIf now reads `thread.isEmpty` instead of `messages.length === 0`, matching the loading-aware field already used by ThreadEmpty and AuiIf. First-party examples and docs samples that still called the leftover wrappers now use `AuiIf` directly.
