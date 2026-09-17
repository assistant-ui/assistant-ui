---
"@assistant-ui/react-streamdown": patch
---

fix: keep settled code blocks from re-rendering when streamdown re-renders their block

a custom `SyntaxHighlighter` ran again for every settled code block on each streamed token when any `components` entry was an inline function, and for every code block once an `animated` message completed; components reading `useStreamdownPreProps` re-rendered the same way. `PreOverride` now keeps its context value while the parsed pre props are equal by value, the code adapter compares the hast `node` by value, and an inline `componentsByLanguage` map keeps its identity while its entries are unchanged. a code block whose fence metadata changes while its code stays the same now hands the new `node` to `CodeHeader` and `SyntaxHighlighter` instead of the previous one.
