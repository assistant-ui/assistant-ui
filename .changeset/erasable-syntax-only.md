---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/tap": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"assistant-cloud": patch
"@assistant-ui/cloud-ai-sdk": patch
"assistant-stream": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-data-stream": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
"safe-content-frame": patch
"@assistant-ui/store": patch
---

Enable `erasableSyntaxOnly` and `verbatimModuleSyntax` in the shared tsconfig base. Constructor parameter properties are now explicit field declarations, and the four public enums (`CommitPriority`, `HideAndFloatStatus`, `LangGraphKnownEventTypes`, `DataStreamStreamChunkType`) are `as const` objects with equivalent union types — runtime values are unchanged, but code relying on enum-nominal typing now sees the literal union instead.
