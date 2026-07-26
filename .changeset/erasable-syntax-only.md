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

Compile with `erasableSyntaxOnly` and `verbatimModuleSyntax`: parameter properties become explicit fields, public enums become `as const` objects with equivalent union types.
