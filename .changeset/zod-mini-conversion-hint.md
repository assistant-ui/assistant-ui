---
"assistant-stream": patch
---

fix: name the Zod helper when a Zod schema has no JSON Schema converter

a `zod/mini` schema carries no `~standard.jsonSchema` converter and no schema-level `toJSONSchema`, so it reaches the unconvertible-schema error. that error now names `z.toJSONSchema(schema)` instead of pointing at "that library's Standard JSON Schema helper", which a Zod user had to go and find.
