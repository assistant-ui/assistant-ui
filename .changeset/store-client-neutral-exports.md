---
"@assistant-ui/store": patch
---

feat: export useAssistantContextValue from the client entry

The framework-neutral client subpath now carries the ambient-client read, so store entries can stay off the React-coupled barrel.
