---
"assistant-ui": patch
---

chore(cli): drop `with-parent-id-grouping` from the `--example` list. the example demonstrated `MessagePrimitive.Unstable_PartsGroupedByParentId`, which is deprecated; its grouping pattern is now better demonstrated by `with-chain-of-thought` using `MessagePrimitive.GroupedParts`, and the sources gap is closed by emitting `source-url` parts from a `search_web` tool in the same example. `npx assistant-ui create -e with-parent-id-grouping` will no longer resolve.
