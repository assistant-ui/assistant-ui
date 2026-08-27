---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

refactor: single-source the code-fence contract on a react-markdown subpath. the CodeHeader/SyntaxHighlighter prop types, the by-language override entry, and the language-class parser now live in @assistant-ui/react-markdown/code-fence; react-streamdown re-exports the types from there instead of keeping structurally compatible copies. @types/hast moves to dependencies in both packages so the published declarations reference hast by name instead of a broken store-relative path.
