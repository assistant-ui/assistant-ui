---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/cloud-ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-devtools": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-mcp": patch
---

refactor: adjust state during render where an effect only mirrored a prop

The composer trigger's keyboard and navigation resources, and the devtools panel and thread tab, reset their state during render instead of scheduling a second pass from an effect, so a prop change settles in one render. Effects that genuinely synchronize with an external system (a clock, a subscription catch-up, an async load, a registry write undone on unmount) keep their `setState`.
