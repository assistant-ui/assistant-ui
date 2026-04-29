---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts

Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

`GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.
