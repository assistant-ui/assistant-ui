---
"assistant-stream": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-ag-ui": patch
---

forward per-tool `providerOptions` from `useAssistantTool` through `toToolsJSONSchema` and `frontendTools` into the AI SDK request body, and emit tool entries in alphabetical order so identical tool sets produce byte-identical request bodies for stable prompt caching. `react-ag-ui` inherits the sort via `toAgUiTools`, so identical tool sets reach the AG-UI runtime in a stable order regardless of mount order.

this lets you opt into provider-specific tool features (e.g. Anthropic's `defer_loading`, Anthropic Tool Search Tool) without any provider-aware code in assistant-ui:

```ts
useAssistantTool({
  toolName: "get_weather",
  parameters: schema,
  providerOptions: { anthropic: { deferLoading: true } },
  execute: async ({ city }) => fetchWeather(city),
});
```

the value is passed through verbatim; the AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...) interprets it.
