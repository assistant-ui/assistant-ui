---
"@assistant-ui/react-lexical": patch
---

`LexicalComposerInput` accepts `formatter={null}` to keep composer text as plain text, so directive-shaped text set through the runtime round-trips unchanged; registered trigger formatters still apply.
