---
"@assistant-ui/ai-sdk": patch
---

feat: the whole package now loads and runs react-free under the documented bundler alias `react: "@assistant-ui/tap/standalone-shim"` (whose string-prefix form also routes the `react/*` subpaths, including the new `jsx-runtime` entries), and `react` becomes an optional peer dependency. The react-less path is pinned by a standalone test project that streams an `AISDKChat` round trip through the aliased graph.
