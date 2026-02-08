---
"@assistant-ui/store": minor
---

feat: add useAuiStateShallow hook to prevent infinite re-renders

When using `useAuiState` with selectors that return objects or arrays, React's `useSyncExternalStore` triggers infinite re-renders because each selector call creates a new object reference that fails `Object.is` comparison.

This adds `useAuiStateShallow` which uses shallow equality comparison to maintain stable references when the object contents are identical.

```typescript
// ❌ Causes infinite re-render loop
const { count, isActive } = useAuiState(({ thread }) => ({
  count: thread.messages.length,
  isActive: thread.status?.type === "running",
}));

// ✅ Works correctly with shallow comparison
const { count, isActive } = useAuiStateShallow(({ thread }) => ({
  count: thread.messages.length,
  isActive: thread.status?.type === "running",
}));
```

Also exports the `shallow` utility function for custom equality comparisons.
