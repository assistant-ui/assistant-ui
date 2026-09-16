---
"assistant-stream": patch
---

fix: normalize configurable JSON Schema converters to draft-07

`toJSONSchema` asked only one of its conversion paths for a dialect, so the same tool definition emitted draft-07 or draft-2020-12 depending on the schema library. object-level `toJSONSchema()` methods are now asked for draft-07 as well, and a converter that was handed that target and answers in another dialect is rejected instead of cast to `JSONSchema7`. the `~standard.toJSONSchema` hook is gone: it is not part of the Standard Schema spec, no library implements it, and it preempted the spec's `~standard.jsonSchema` converter. an unconvertible schema now names its own library in the error instead of telling every user to upgrade Zod.

`toJSON()` results and plain JSON Schema objects take no target and still pass through in whatever dialect they carry, so forwarding a remote tool's `inputSchema` verbatim keeps working.
