---
"@assistant-ui/react-markdown": patch
---

fix(react-markdown): `normalizeMathDelimiters` also keeps a `$$` fence opened on a list item's marker line inside that item when a formula line starts with `+` or `-`, when the item sits in a blockquote, and when the body holds a code span
