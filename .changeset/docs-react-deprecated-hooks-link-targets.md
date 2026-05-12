---
"@assistant-ui/react": patch
---

docs: link migration targets and guide URLs in deprecated legacy runtime hooks

converts the `useAui` / `useAuiState` references in `@deprecated` notes across `useAssistantRuntime`, `useThreadRuntime`, `useComposerRuntime`, `useMessageRuntime`, `useMessagePartRuntime`, `useAttachmentRuntime`, `useThreadListItemRuntime`, and their state-hook siblings to use `{@link}`. also wraps the migration guide URL in `{@link}` so IDE hover cards render a clickable link directly to the replacement and the guide.
