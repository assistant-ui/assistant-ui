---
"@assistant-ui/react": patch
---

fix: robust top-turn anchoring with viewport-owned reserve

**Migration:**

- Remove `ThreadPrimitive.ViewportSlack` from your tree. It has been removed from the public API because top-anchor target registration is now handled automatically by `MessagePrimitive.Root` when `turnAnchor="top"`.
- If you customized `fillClampThreshold` / `fillClampOffset` on `ThreadPrimitive.ViewportSlack` or `MessagePrimitive.Root`, replace them with `topAnchorMessageClamp` on `ThreadPrimitive.Viewport`:

```tsx
// Before, either:
<MessagePrimitive.Root fillClampThreshold="10em" fillClampOffset="6em" />

// or:
<ThreadPrimitive.ViewportSlack fillClampThreshold="10em" fillClampOffset="6em">
  ...
</ThreadPrimitive.ViewportSlack>

// After
<ThreadPrimitive.Viewport
  turnAnchor="top"
  topAnchorMessageClamp={{ tallerThan: "10em", visibleHeight: "6em" }}
>
  ...
</ThreadPrimitive.Viewport>
```
