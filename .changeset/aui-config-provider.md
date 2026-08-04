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

feat: AuiProvider extends/config grammar. `config={AuiConfig({...})}` alone creates a top-level root client; nested providers must pass `extends` — a client to extend, or `null` to isolate (dev-enforced). An empty config creates a client extending the `extends` client; `ref` exposes the resulting client. The `config` prop only accepts configs built with `AuiConfig(...)` (branded type). AssistantRuntimeProvider gains an optional `config` prop whose scopes are provided alongside the runtime scope. The `useAui({...})` extension overload and the AuiProvider `value` prop are deprecated; `value={client}` now exposes a client extending the given one (same scopes, new identity) rather than the exact instance. `useAui({})` with an empty scope object now mounts a rooted host (so the scope set can grow across renders) instead of a passthrough derived-only client. `useAuiState` state enumeration (`Object.keys`/spread) now includes scopes inherited from parent clients, matching `in`-operator behavior. Clients derived from a hand-built parent (a plain object with `subscribe`/`on`) forward scoped `on(...)` listeners to the parent's `on` instead of throwing for scopes the parent does not expose.
