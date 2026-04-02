---
"@assistant-ui/react": patch
---

fix: unify assistant-transport request body format with AssistantChatTransport

`callSettings` and `config` are now sent as nested objects in the request body,
aligned with the AI SDK transport. The old top-level spread is preserved for
backward compatibility but deprecated and will be removed in a future version.
