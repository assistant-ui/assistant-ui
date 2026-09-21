---
"@assistant-ui/react-streamdown": patch
---

fix: let a new `SyntaxHighlighter`, `CodeHeader` or `componentsByLanguage` entry reach settled code blocks

a code block that streamdown had already rendered kept the previous highlighter or header when `components.SyntaxHighlighter`, `components.CodeHeader` or an entry of `componentsByLanguage` changed without new text, because streamdown's root memo ignores `components` and never re-renders the block. the code adapter now reads its components from a context that the primitive provides above streamdown, so the change reaches every mounted code block in place; the block, its siblings and the rest of the message keep their DOM and state, and a streamed token still re-renders nothing that has settled.
