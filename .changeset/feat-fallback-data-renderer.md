---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-langgraph": patch
---

feat: add fallback data renderer and LangGraph uiComponents integration

Add `makeAssistantFallbackDataUI` and `useAssistantFallbackDataUI` to register a catch-all renderer that handles data UI parts with no name-specific renderer. This enables dynamic component loading (e.g., LangSmith's `LoadExternalComponent`) without requiring build-time registration of every component name.

Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `loader` fallback for dynamic loading, directly from the runtime hook.
