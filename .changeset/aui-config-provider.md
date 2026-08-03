---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-mcp": patch
"@assistant-ui/react-o11y": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/metro": patch
---

feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config provides the `extends` client as-is; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated.
