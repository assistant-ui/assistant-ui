---
"@assistant-ui/store": patch
---

fix: `RenderChildrenWithAccessor` no longer misses re-renders when state updates after access

The accessor previously reused a single ref as both an "accessed" sentinel and the cached snapshot. A `useSyncExternalStore` post-commit consistency call could repopulate that cache with the current state, causing later real updates (e.g. `message.composer.isEditing` flipping) to be masked. Access is now tracked with a dedicated flag so children that read item state via the render prop re-render correctly when the underlying state changes.
