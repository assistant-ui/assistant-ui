---
"@assistant-ui/react-ink-markdown": patch
---

`MarkdownText` only emits OSC 8 hyperlinks for absolute http, https and mailto URLs, and writes the normalized URL into the sequence. Links with any other scheme, or relative links, render as plain text.
