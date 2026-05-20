---
"@assistant-ui/react": patch
---

fix thread initialization timing race which caused `scrollToBottomOnInitialize` to fail in `useLocalRuntime`
