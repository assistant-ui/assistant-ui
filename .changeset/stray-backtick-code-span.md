---
"@assistant-ui/react-markdown": patch
---

fix: a lone backtick no longer pairs with a code span in a later list item, heading or blockquote, so the preprocess helpers leave that code span's `$` and `\(...\)` as written; headings, thematic breaks and HTML blocks inside nested list items are recognized the same way
