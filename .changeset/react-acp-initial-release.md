---
"@assistant-ui/react-acp": minor
---

feat: add `@assistant-ui/react-acp`, an adapter that runs Agent Client Protocol (ACP v1) agents inside assistant-ui. Ships `AcpClient` (JSON-RPC over WebSocket or stdio), `AcpThreadRuntimeCore` (maps `session/update` notification streams onto the thread runtime), `useAcpRuntime` (external-store adapter for `AssistantRuntimeProvider`), and `useAcpConnectionState`. Client subscription is StrictMode-safe (effect-driven attach/detach); validated against a live ACP agent server, 46 unit tests.
