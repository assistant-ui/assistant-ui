---
"@assistant-ui/ai-sdk": patch
---

feat: the whole package now loads and runs under the `react` to `@assistant-ui/tap/standalone-shim` alias with no real React installed, and `react` becomes an optional peer dependency. The react-less path is pinned by a standalone test project that streams an `AISDKChat` round trip through the aliased graph.
