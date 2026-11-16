---
"@assistant-ui/generative-ui": patch
---

fix: `Box` keeps a `width` or `height` only when it is a number, a CSS length, a sizing keyword or a `calc`/`min`/`max`/`clamp` of those, and `Box` and `Card` drop a `background` that holds `;`, `{` or `}`, so server-rendered styles hold one value per property.
