---
"@assistant-ui/react-streamdown": patch
---

fix(react-streamdown): end streaming `$$` math where remark-math ends it, so a `$$` inside a display block no longer leaks escapes into the math or appends a stray closer
