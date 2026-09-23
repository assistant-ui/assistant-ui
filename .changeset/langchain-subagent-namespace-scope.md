---
"@assistant-ui/react-langchain": patch
---

fix: keep a subagent transcript scoped to its own namespace, so a nested subagent's messages no longer replace its parent's transcript while the nested task runs
