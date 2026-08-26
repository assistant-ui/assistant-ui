---
"@assistant-ui/react-langgraph": patch
---

fix: skip malformed stream payloads instead of throwing, and latch tuple mode only after a valid tuple, and leave values undefined on a non-object snapshot
