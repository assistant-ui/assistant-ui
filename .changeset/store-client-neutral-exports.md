---
"@assistant-ui/store": patch
---

feat: export useAssistantContextValue and getClientId from the client entry

The framework-neutral client subpath now carries the ambient-client read and the client identity helper, so store entries and adapters can stay off the React-coupled barrel.
