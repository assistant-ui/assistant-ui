---
"@assistant-ui/store": patch
"@assistant-ui/core": patch
"@assistant-ui/react-mcp": patch
---

fix: model-context registrations follow the committed scope across structural replacements. The new `useAssistantScopeEffect(scope, effect, deps)` re-runs a registration when the scope's bound client is replaced (cleaning up against the old one first) while ignoring value updates, and the toolkit, runtime-adapter, interactables, and MCP registration sites now use it instead of registering once against a stable client ref.
