---
"@assistant-ui/react": patch
---

fix: robust top-turn anchoring with viewport-owned reserve

**Migration:**

- Remove `ThreadPrimitive.ViewportSlack` from your tree (now a no-op).
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
