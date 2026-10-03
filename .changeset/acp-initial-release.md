---
"@assistant-ui/acp": patch
---

feat: add `@assistant-ui/acp`, an adapter that runs Agent Client Protocol (ACP v1) agents inside assistant-ui. Ships `AcpClient` (JSON-RPC over a single WebSocket), `AcpThreadController` plus the pure `reduceAcpThreadState` reducer (maps `session/update` notification streams onto thread state), `useAcpRuntime` (external-store adapter for `AssistantRuntimeProvider`), and extras hooks for connection state, session, plan, mode, commands, config options and usage. Client subscription is StrictMode-safe (registry-driven attach/detach); 182 unit tests.
