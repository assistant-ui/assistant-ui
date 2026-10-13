---
"generative-frame": patch
---

fix: `readThemeTokens` follows the page's `--font-sans`, or the body's computed font family when the page declares none, with the default system sans-serif stack, and a `--font-mono` the page declares with the default monospace stack, so a widget on a page whose web fonts do not load inside the frame, such as a `next/font` family without a generic fallback, renders in a system face of the same kind instead of the browser's serif default.
