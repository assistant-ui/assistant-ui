---
"@assistant-ui/core": minor
"@assistant-ui/react": minor
---

feat: drop APIs deprecated in v0.12/v0.14 — the legacy context hooks (`useAssistantRuntime`, `useThreadRuntime`, `useThread`, `useMessageRuntime`, `useMessage`, `useComposerRuntime`, `useComposer`, `useMessagePartRuntime`, `useMessagePart`, `useAttachmentRuntime`, `useAttachment`, `useThreadListItemRuntime`, `useThreadListItem`, `useThreadList`, `useEditComposer` and their attachment variants; use `useAui` / `useAuiState`), the component-only `ToolsState.tools` map (use `toolUIs`), and the `"mcp-app"` group key in `groupPartByType` (use `"standalone-tool-call"`). See the [v0.15 migration guide](https://assistant-ui.com/docs/migrations/v0-15).
