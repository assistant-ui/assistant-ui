---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: add store-level fallback data renderer for dynamic ui loading

Add `makeAssistantFallbackDataUI` and `useAssistantFallbackDataUI` to register a catch-all renderer that handles data UI parts with no name-specific renderer. This enables dynamic component loading (e.g., LangSmith's `LoadExternalComponent`) without requiring build-time registration of every component name.
