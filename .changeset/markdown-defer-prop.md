---
"@assistant-ui/react-streamdown": patch
"@assistant-ui/react-markdown": patch
---

feat: opt-in `defer` prop on the markdown text primitives

`StreamdownTextPrimitive` and `MarkdownTextPrimitive` accept a `defer` flag that routes the streamed text through `useDeferredValue`, so re-parsing the growing message runs at a lower priority and typing/scrolling stay responsive while a long message streams in. intermediate streaming states may be skipped under load; the final text always renders. default off; the shadcn kit's markdown-text turns it on.
