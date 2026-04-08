---
"@assistant-ui/react-langgraph": patch
---

feat(react-langgraph): support LangSmith Generative UI `ui_message`

- Translate UI messages into `DataMessagePart`s on the associated assistant message, rendered via the existing `makeAssistantDataUI({ name, render })` API
- Accumulate UI messages from both `custom` stream events (raw `{type:"ui"}` / `{type:"remove-ui"}`) and the `values.ui` state snapshot
- Key UI entries by `ui.id`, shallow-merge props when `metadata.merge === true`, delete on `type:"remove-ui"`
- Expose `uiStateKey` config option for graphs that customize the `typedUi` state key
- Extend the `load` callback return type with `uiMessages` so persisted UI state can be restored on thread switch
- Expose `useLangGraphUIMessages()` for accessing the raw UI message list
- Export `UIMessage`, `RemoveUIMessage`, and `UseLangGraphRuntimeOptions` types

**Behavior change:** `{type:"ui"}` / `{type:"remove-ui"}` payloads received on the `custom` stream channel are now intercepted by the adapter before reaching `eventHandlers.onCustomEvent`. Other custom events still reach the handler unchanged.
