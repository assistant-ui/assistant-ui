---
"@assistant-ui/react-langgraph": patch
---

fix: preserve each run's configuration across automatic tool-result resumes,
including parallel tools, streamed tool-call IDs, and loaded thread history

Loaded messages without IDs now receive stable local IDs before entering runtime
state, preventing their derived tool-call IDs from changing on the first run.
