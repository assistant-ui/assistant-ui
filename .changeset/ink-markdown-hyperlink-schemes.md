---
"@assistant-ui/react-ink-markdown": patch
---

`MarkdownText` only emits OSC 8 hyperlinks for absolute http and https URLs, and writes the normalized URL into the sequence. If a message has a link with any other scheme, or a relative link, the message renders as with hyperlinks off, so every link shows its destination as text.
