---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

fix: correct settled and failed tool-call arg conversion

Stop re-reporting a settled tool call's unchanged arguments each time it is reconverted (which could OOM the renderer on large args), skip re-serializing them while the call keeps the same input object, and preserve a schema-failed tool call's arguments from `rawInput` instead of converting the error snapshot to `{}`.
