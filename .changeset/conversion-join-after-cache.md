---
"@assistant-ui/core": patch
---

perf(core): a streaming token through `useExternalMessageConverter`, or through `convertExternalMessages` with a conversion cache, no longer rejoins every finished message in the thread
