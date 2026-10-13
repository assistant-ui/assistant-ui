---
"generative-frame": patch
---

fix: when the page defines no `--font-sans`, `readThemeTokens` follows the body's computed font family with the default system font stack, so a widget on a page whose web fonts do not load inside the frame, such as a `next/font` family, renders in a sans-serif face instead of the browser's serif default.
