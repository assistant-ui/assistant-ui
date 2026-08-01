---
"@assistant-ui/react-langgraph": patch
---

fix: preserve each run's configuration across automatic tool-result resumes,
including parallel tools, streamed tool-call IDs, and loaded thread history
