---
"@assistant-ui/react-streamdown": patch
---

fix: keep streaming repair out of every fence and `$$` block, including one that opens after a paragraph line or nests in a list item, so `~` inside code and math is no longer escaped and a dangling `**` before a fence no longer lands its closer after the closing marker
