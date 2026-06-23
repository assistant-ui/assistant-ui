---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

add unstable id-keyed thread message rendering APIs for virtualized and custom message lists. `unstable_useThreadMessageIds()` returns the thread's message ids (stable array identity across content-only updates), and `ThreadPrimitive.Unstable_MessageById` renders a single message by id with the same component surface as `MessageByIndex`. A missing or removed id renders `null` instead of throwing.
