---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

reasoning parts carry an optional `timing` with their start and end times, typed as the new `MessagePartTiming` that `ToolCallTiming` now aliases, so a host can show how long its agent thought; the assistant-stream accumulator stamps it while reasoning streams, joined reasoning parts and the cloud format keep it, and a `MessagePrimitive.GroupedParts` group reports the span of its timed parts as `timing`
