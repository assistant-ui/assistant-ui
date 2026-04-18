---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

feat(react-langgraph): add uiComponents option for static and dynamic data renderers

Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `fallback` renderer for dynamic loading (e.g. LangSmith's `LoadExternalComponent`), directly from the runtime hook.

Core `DataRenderers` scope also gains a `fallbacks` stack (plus `setFallbackDataUI` method) that the adapter registers into; resolution is `renderers[name][0]` → `fallbacks[0]` → inline `Fallback`.
