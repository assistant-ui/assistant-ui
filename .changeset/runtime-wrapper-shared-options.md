---
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-langgraph": patch
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-opencode": patch
---

align the runtime wrapper hooks so every distribution forwards the same set of optional adapter-level fields to `useExternalStoreRuntime`. closes #4134.

new options on `useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`:

- `isDisabled` — disables the composer input entirely.
- `isSendDisabled` — keeps the input usable but makes `send()` a no-op (paired with `composer.canSend`).
- `unstable_capabilities` — per-thread capability overrides (currently `{ copy?: boolean }`).
- `suggestions` — follow-up suggestions list, flows into `thread.suggestions`.

adapter-level additions, where missing:

- `useChatRuntime` / `useAISDKRuntime` already accepted `dictation` and `voice` through the `ExternalStoreAdapter` adapter shape; this just confirms the typing.
- `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime` now accept `dictation` and `voice` in their `adapters` object and forward them through.
- `useOpenCodeRuntime` gains an `adapters` option for the first time (attachments / speech / dictation / voice / feedback).

every new field is optional and defaults to the prior behavior, so existing call sites need no changes.
