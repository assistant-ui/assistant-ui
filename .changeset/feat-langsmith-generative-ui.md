---
"@assistant-ui/react-langgraph": patch
---

feat(react-langgraph): support LangSmith Generative UI `ui_message`

- Translate UI messages into `DataMessagePart`s on the associated assistant message, rendered via the existing `makeAssistantDataUI({ name, render })` API
- Accumulate UI messages from both `custom` stream events (raw `{type:"ui"}` / `{type:"remove-ui"}`) and the `values.ui` state snapshot
- Mirror the upstream `uiMessageReducer` semantics: key by `ui.id`, shallow-merge props when `metadata.merge === true`, delete on `type:"remove-ui"`
- Expose `useLangGraphUIMessages()` for accessing the raw UI message list
- Export `UIMessage` and `RemoveUIMessage` types
