---
"@assistant-ui/react-ai-sdk": patch
"assistant-stream": patch
---

fix: cache-stable tool disclosure. `toToolsJSONSchema` now sorts tool names by default (override with `sort: false`). `react-ai-sdk` switches the Anthropic Tool Search wiring from the body flag `include_tool_search_tool` to a tool-entry `{ type: "tool_search_tool_bm25_20251119" }`, and emits `defer_loading: true` under `providerOptions.anthropic.deferLoading` so AI SDK v6 honors it.
