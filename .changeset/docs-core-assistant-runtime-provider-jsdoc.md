---
"@assistant-ui/core": patch
---

docs: add JSDoc for `AssistantRuntimeProvider`

documents the provider used to mount a runtime built with `useLocalRuntime`, `useExternalStoreRuntime`, `useAssistantTransportRuntime`, etc., including the fact that it installs an `AuiProvider` internally so descendants can use `useAui`/`useAuiState` without extra setup.
