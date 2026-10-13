---
"generative-frame": patch
---

fix: `readThemeTokens` follows the page's `--font-sans`, or the body's computed font family when the page declares none, with the default system sans-serif stack, and a `--font-mono` the page declares with the default monospace stack, so on a page whose font stack names only web fonts with no generic fallback, such as a `next/font` family, a widget renders in a system face of the same kind instead of the browser's serif default; a stack that ends in a generic family keeps it.
