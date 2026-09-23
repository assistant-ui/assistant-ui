---
"@assistant-ui/react-streamdown": patch
"@assistant-ui/react-markdown": patch
---

fix(markdown): end quoted code fences and `$$` blocks where their own blockquote ends, so a deeper `>` line no longer closes one early and a blank or shallower line no longer leaves one open
