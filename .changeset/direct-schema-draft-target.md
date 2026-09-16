---
"assistant-stream": patch
---

fix: normalize configurable JSON Schema converters to draft-07

`toJSONSchema` asked only one of its conversion paths for a dialect, so the same tool definition emitted draft-07 or draft-2020-12 depending on the schema library. object-level `toJSONSchema()` methods are now asked for draft-07 as well, and the Standard JSON Schema converter, which declares `StandardJSONSchemaV1.Options` as its input and so agreed to the term, is rejected instead of cast when it answers in another dialect. the `~standard.toJSONSchema` hook is gone: it is not part of the Standard Schema spec, no library implements it, and it preempted the spec's `~standard.jsonSchema` converter. an unconvertible schema now names its own library in the error instead of telling every user to upgrade Zod.

nothing else is held to the target. duck-typed `toJSONSchema()` methods, `toJSON()` results and plain JSON Schema objects pass through in whatever dialect they carry, so forwarding a remote tool's `inputSchema` verbatim keeps working.
