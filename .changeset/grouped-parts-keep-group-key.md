---
"@assistant-ui/core": patch
---

`MessagePrimitive.GroupedParts` keeps a group mounted when a part without an identity, such as reasoning, lands ahead of the tool calls it already holds. The group keeps its earlier key while one of those tool calls stays in it, so state inside it, like an open tool group, survives.
