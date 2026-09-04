---
"@assistant-ui/ai-sdk": patch
---

docs: say where route metadata lands on a thread message

`useThreadTokenUsage` documents that metadata a route attaches through `messageMetadata` reaches the client under `metadata.custom`, which is where the converter puts every key outside the thread metadata shape.
