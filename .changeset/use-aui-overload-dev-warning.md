---
"@assistant-ui/store": patch
---

feat: warn once in development when the deprecated `useAui({ ... })` overload is called, pointing to `AuiConfig` with `<AssistantRuntimeProvider config>` or `<AuiProvider extends config>`; the overload's JSDoc example now shows the replacement
