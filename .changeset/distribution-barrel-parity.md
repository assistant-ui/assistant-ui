---
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: every distribution re-exports the same shared surface from `@assistant-ui/core`. `@assistant-ui/react-ink` gains `ReadonlyThreadProvider`, `ToolCallMessagePartStatus`, `groupPartByType`, `GroupByContext`, `VoiceSessionState`, the external store runtime (`useExternalStoreRuntime`, `useExternalMessageConverter`, their adapters and options), the message queue, the tool approval types, the generative UI renderer and the cloud thread list hooks; `@assistant-ui/react-native` gains `VoiceSessionState`, the cloud thread list hooks, the generative UI renderer and the runtime state and adapter types the web package already carried; `@assistant-ui/react` gains `MessageRole`, `RunConfig`, `RuntimeCapabilities`, `RemoteThreadListOptions`, `ThreadsState`, `JoinStrategy`, `TitleGenerationAdapter`, `createSimpleTitleAdapter` and `ChainOfThoughtPartByIndexProvider`.
