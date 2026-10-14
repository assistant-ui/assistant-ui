---
"@assistant-ui/generative-ui": patch
---

fix: Badges stay readable inside a tinted Card on React Native: default and info Badges use an opaque theme pair there, and tone text in Badges and Fact chips mixes 55% tone with the ink instead of 60%, which keeps it above 4.5:1 on a dark tint.
