---
"@assistant-ui/react": patch
---

fix: robust top-turn anchoring with viewport-owned reserve

**Migration:**

- Remove `ThreadPrimitive.ViewportSlack` from your tree. It has been removed from the public API because top-anchor target registration is now handled automatically.
- If you customized `fillClampThreshold` / `fillClampOffset`, replace with `topAnchorMessageClamp` on `ThreadPrimitive.Viewport`:

```tsx
// Before
<ThreadPrimitive.ViewportSlack fillClampThreshold="10em" fillClampOffset="6em">

// After
<ThreadPrimitive.Viewport
  turnAnchor="top"
  topAnchorMessageClamp={{ tallerThan: "10em", visibleHeight: "6em" }}
>
```
