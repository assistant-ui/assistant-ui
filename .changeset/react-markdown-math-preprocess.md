---
"@assistant-ui/react-markdown": patch
---

fix(react-markdown): keep display math inside a quoted list item, rewrite a `\[...\]` display whose body holds a code span, and stop reading a list marker line inside an open `$$` block as an opener
