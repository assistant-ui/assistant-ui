---
"@assistant-ui/store": patch
---

feat: createAssistantClient accepts an AssistantConfigSource, re-read in the root render so bindings can deliver config changes (updated element args, added or removed scopes) without remounting surviving scopes
