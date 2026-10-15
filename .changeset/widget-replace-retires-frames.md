---
"generative-frame": patch
---

fix(generative-frame): remove a replacement frame that a newer `replace()` supersedes or the widget disposes while it renders, so it cannot keep reaching host handlers
