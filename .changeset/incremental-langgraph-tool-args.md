---
"@assistant-ui/react-langgraph": patch
---

fix: parse streamed LangGraph tool arguments incrementally instead of reparsing the complete prefix for every delta
