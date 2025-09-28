---
"@assistant-ui/react-langgraph": patch
---

fix: Handle undefined extras in useLangGraphInterruptState

Fixed an issue where useLangGraphInterruptState would throw errors when thread extras are undefined (e.g., with EMPTY_THREAD_CORE). The hook now safely returns undefined when extras are not available, and uses useAssistantApi for imperative operations in useLangGraphSend to avoid similar issues.