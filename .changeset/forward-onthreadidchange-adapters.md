---
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-opencode": patch
"@assistant-ui/react-pi": patch
---

feat: forward `onThreadIdChange` through the adapter entry hooks (`useLangGraphRuntime`, `useStreamRuntime`, `useChatRuntime`, `useAdkRuntime`, `useOpenCodeRuntime`, `usePiRuntime`). the option already existed on `useRemoteThreadListRuntime` but every wrapper dropped it, so routing/persistence built on the settled remote thread id never fired from these hooks. only the settled remote id is emitted; the transient `__LOCALID_*` placeholder is never surfaced.
