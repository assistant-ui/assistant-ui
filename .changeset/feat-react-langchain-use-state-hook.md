---
"@assistant-ui/react-langchain": patch
---

feat: add `useLangChainState<T>(key)` hook to read arbitrary LangGraph custom state keys (e.g. `todos`, `files`) from the current thread, mirroring upstream `useStream().values[key]`.
