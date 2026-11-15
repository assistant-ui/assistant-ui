---
"@assistant-ui/generative-ui": patch
---

fix: `Box` keeps a `width` or `height` only when it is a CSS length, and drops a `background` that holds `;`, `{` or `}`, so server-rendered styles hold one value per property. With `imageOrigins` set, `data:` images load only when the list includes `"data:"`.
