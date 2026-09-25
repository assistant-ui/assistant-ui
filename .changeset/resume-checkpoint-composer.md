---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/ai-sdk": patch
---

Add explicit adapter-owned `canResume` state and a `useComposerResume` hook, with a web `ComposerPrimitive.Resume` button. Unsupported adapters retain the existing send/cancel behavior.
