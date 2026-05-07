---
"@assistant-ui/react": minor
"@assistant-ui/core": minor
"@assistant-ui/react-langgraph": minor
"@assistant-ui/react-opencode": patch
---

chore: drop APIs deprecated in v0.11/v0.12

See the [v0.14 migration guide](https://assistant-ui.com/docs/migrations/v0-14) for the full removal list and replacements.

- `useAssistantApi` / `useAssistantState` / `useAssistantEvent` / `AssistantIf` removed (use `useAui` / `useAuiState` / `useAuiEvent` / `AuiIf`).
- `getExternalStoreMessage` (singular) removed (use `getExternalStoreMessages`).
- `MessageState.submittedFeedback` removed (use `message.metadata.submittedFeedback`).
- `ThreadRuntime.startRun(parentId)` positional overload removed (pass `{ parentId }`).
- `ThreadRuntime.unstable_loadExternalState` removed (use `importExternalState`).
- `ThreadRuntime.unstable_resumeRun` removed (use `resumeRun`).
- `ThreadRuntime.getModelConfig` removed (use `getModelContext`).
- `AssistantRuntime.threadList` / `switchToNewThread` / `switchToThread` / `registerModelConfigProvider` / `reset` removed (use `threads` / `threads.switchToNewThread` / `threads.switchToThread` / `registerModelContextProvider` / `thread.reset`).
- `ChatModelRunOptions.config` removed (use `context`).
- `useLocalThreadRuntime` alias removed (use `useLocalRuntime`).
- `unstable_useRemoteThreadListRuntime` / `unstable_useCloudThreadListAdapter` / `unstable_RemoteThreadListAdapter` / `unstable_InMemoryThreadListAdapter` aliases removed (drop the `unstable_` prefix).
- `react-langgraph` `onSwitchToThread` removed (use `load`).
- `toAISDKTools` / `getEnabledTools` removed (use `toToolsJSONSchema` from `assistant-stream`).
