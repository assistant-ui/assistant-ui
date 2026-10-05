---
"@assistant-ui/core": patch
---

name local runtime initial messages from React's useId during a server render, so a Next.js cacheComponents prerender no longer reads Math.random; the browser keeps random ids
