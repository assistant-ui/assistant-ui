---
"@assistant-ui/core": patch
---

feat: expose framework-neutral seams on the ./store entry (useExternalMessageConverter, convertExternalMessages, useStreamingTiming, createRuntimeExtrasBrand, defineToolkit, defineMcpToolkit) and add unstable_createRuntimeExtrasFromBrand so bindings can share one runtime extras brand across packages
