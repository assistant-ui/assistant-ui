---
"@assistant-ui/core": patch
---

name a remote thread list's first new thread from React's useId during a server render, so a Next.js cacheComponents prerender no longer reads Math.random; the browser keeps a random id
