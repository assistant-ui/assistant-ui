---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: `useAssistantTransportRuntime` accepts `cloud`: Assistant Cloud backs the thread list and every request carries the cloud thread id; without `cloud`, `NEXT_PUBLIC_ASSISTANT_BASE_URL` selects Assistant Cloud, as it does for `useLocalRuntime`. `adapters.history`, which this runtime never read, is deprecated
