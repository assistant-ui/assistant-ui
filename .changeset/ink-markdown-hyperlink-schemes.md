---
"@assistant-ui/react-ink-markdown": patch
---

`MarkdownText` only emits OSC 8 hyperlinks for absolute http and https URLs, and writes the normalized URL into the sequence. Links with any other scheme, or relative links, render as their text followed by the destination, as they do with hyperlinks off.
