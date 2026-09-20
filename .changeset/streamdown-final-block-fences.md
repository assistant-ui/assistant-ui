---
"@assistant-ui/react-streamdown": patch
---

fix: keep the streaming escapes out of every fence and `$$` block, including one that opens right after a paragraph line or nests in a list item, and settle the paragraph a block interrupts, so `~` inside code and math is no longer escaped and a dangling `**` before a fence no longer lands its closer after the closing marker
