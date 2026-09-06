---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/cloud-ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-devtools": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-mcp": patch
---

refactor: stop resetting state from effects where a render-time adjustment does the job

`ReasoningRoot`'s trigger resources, the devtools panel and thread tab, the external thread's feedback map, and the cloud thread selection now adjust their state during render instead of scheduling a second pass from an effect, so a prop change lands in one render. Effects that genuinely synchronize with an external system (a clock, a subscription catch-up, an async load, a registry write undone on unmount) keep their `setState` and carry a `react-hooks/set-state-in-effect` suppression naming the reason.
