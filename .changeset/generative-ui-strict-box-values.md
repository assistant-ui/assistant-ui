---
"@assistant-ui/generative-ui": patch
---

fix: `Box` keeps a `width` or `height` only when it is a number, a CSS length, a sizing keyword or a `calc`/`min`/`max`/`clamp` of those, and `Box` and `Card` drop a `background` that holds `;`, `{`, `}`, a quote, a bracket, an unclosed parenthesis or a comment, and the same goes for a size, so server-rendered styles hold one value per property.
