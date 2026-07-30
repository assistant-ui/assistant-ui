---
"@assistant-ui/react-langgraph": patch
---

fix(react-langgraph): route the values path through `appendMessage` so carry-forward fixes apply to `replaceMessages` and `reconcileMessages`, not only the chunk path