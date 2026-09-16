---
"assistant-stream": patch
---

fix: guarantee draft-07 output from `toJSONSchema`

`toJSONSchema` typed its result `JSONSchema7`, but three of its four conversion paths had no way to request a dialect, so the same tool definition emitted draft-07 or draft-2020-12 depending on the schema library. object-level `toJSONSchema()` methods are now asked for draft-07, and any result that declares a `$schema` dialect other than draft-07 is rejected rather than passed through as `JSONSchema7`. the `~standard.toJSONSchema` hook is gone: it is not part of the Standard Schema spec, no library implements it, and it preempted the spec's `~standard.jsonSchema` converter. an unconvertible schema now names its own library in the error instead of telling every user to upgrade Zod.
