---
"@assistant-ui/react-opencode": patch
---

feat: `useOpenCodeRuntime` accepts `cloud`: Assistant Cloud backs the thread list, and each cloud thread maps to an OpenCode session; a cloud thread without a session opens empty and rejects a send instead of asking OpenCode for the cloud id
