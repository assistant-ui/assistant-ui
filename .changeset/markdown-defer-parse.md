---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

perf: parse once per token with `defer` on

the deferred path rendered the previous text at normal priority and the new text in the deferred pass, and react-markdown parses the whole accumulated text on every render, so a token cost two full parses. the renderer is memoized, which turns the urgent pass into a bail-out because that text was parsed on the previous commit. a caller's inline `remarkPlugins` array no longer defeats the memo.
