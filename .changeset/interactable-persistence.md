---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: add interactable state persistence

Add persistence API to interactables with exportState/importState, debounced setPersistenceAdapter, per-id isPending/error tracking, flush() for immediate sync, and auto-flush on component unregister.
