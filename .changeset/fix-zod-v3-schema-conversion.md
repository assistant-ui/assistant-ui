---
"assistant-stream": patch
---

fix(assistant-stream): throw a clear error when a Standard Schema (e.g. Zod v3) cannot be converted to JSON Schema, instead of silently passing through invalid data. Also add support for `~standard.jsonSchema.input()` conversion path.
