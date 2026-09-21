---
"@assistant-ui/react-lexical": patch
---

fix: build the composer with `LexicalExtensionComposer` instead of the deprecated `LexicalComposer`, with `PlainTextExtension` and `HistoryExtension` replacing the legacy plugins. The editable textbox now carries `aria-placeholder`, and the visual placeholder is hidden from assistive technology.
