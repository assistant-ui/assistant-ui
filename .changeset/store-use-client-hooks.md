---
"@assistant-ui/store": patch
---

refactor: rename the client composition and event hooks to the `use*` convention to match the tap resource API: `tapClientResource` -> `useClientResource`, `tapClientLookup` -> `useClientLookup`, `tapClientList` -> `useClientList`, `tapAssistantClientRef` -> `useAssistantClientRef`, `tapAssistantEmit` -> `useAssistantEmit`.
