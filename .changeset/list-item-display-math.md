---
"@assistant-ui/react-markdown": patch
---

fix(react-markdown): `normalizeMathDelimiters` keeps a `$$` fence opened on a list item's marker line, and the paragraph after it, inside that item instead of letting the body fall out of the list
