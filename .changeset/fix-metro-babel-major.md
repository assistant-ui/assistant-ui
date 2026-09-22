---
"@assistant-ui/metro": patch
"@assistant-ui/x-generative-compiler": patch
---

fix: stop `@assistant-ui/metro` from breaking native bundles in Expo apps that use reanimated, by moving its Babel dependencies and those of `@assistant-ui/x-generative-compiler` back to Babel 7, the major Metro and Expo run
