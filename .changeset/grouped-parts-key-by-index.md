---
"@assistant-ui/core": patch
---

fix(core|MessageParts,GroupedParts): key part fibers by absolute part index

Inside `MessagePrimitive.GroupedParts` and the auto-grouped
`toolGroup` / `reasoningGroup` ranges of `MessagePrimitive.Parts`,
leaf fibers were keyed by their **structural position** in the
group tree rather than by the underlying part's absolute index.
When the parts list reshaped (e.g., a thread switch with a
different group layout), React reused the same fiber at a given
structural slot but with a different `index` prop, keeping the
prior tap subscription alive against an index that may now point
at a different part or be out of range — surfacing as
`tapClientLookup: Index N out of bounds` or
`MessagePartText can only be used inside text or reasoning message
parts`. Keying by part index instead causes React to unmount the
fiber when the part underneath actually changes.
