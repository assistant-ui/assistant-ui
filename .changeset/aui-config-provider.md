---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-mcp": patch
"@assistant-ui/react-o11y": patch
"@assistant-ui/react-ink": patch
---

feat: AuiProvider extend/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extend` — a client to extend, or `null` to isolate (dev-enforced). `extend` without a `config` provides the given client as-is. `ref` exposes the resulting client after mount. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated.
