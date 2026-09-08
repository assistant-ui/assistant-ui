---
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
---

fix: keep a fenced display body inside the list item or blockquote it was written in

giving the `$$` markers their own lines put them at the root column, which ends the container the math was written inside: an equation in a list item rendered as a sibling of the list. the markers now carry the prefix of the line the match opened on and the body is aligned to it, and that line is read from the original text so a code span earlier on it cannot truncate it.
