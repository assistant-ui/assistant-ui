---
"generative-frame": patch
---

fix: `readThemeTokens` follows the page's `--font-sans`, or the body's computed font family when the page defines none, with the default system font stack, so a widget on a page whose web fonts do not load inside the frame, such as a `next/font` family, renders in a sans-serif face instead of the browser's serif default.
