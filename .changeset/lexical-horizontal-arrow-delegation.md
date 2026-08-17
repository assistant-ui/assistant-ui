---
"@assistant-ui/react-lexical": patch
---

fix: delegate ArrowLeft/ArrowRight to composer input plugins, matching the textarea input's dispatch, so plugin-driven keyboard navigation (like welcome suggestions opening a group with ArrowRight) works in Lexical composers.
