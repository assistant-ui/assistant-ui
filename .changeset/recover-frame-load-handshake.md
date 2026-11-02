---
"@assistant-ui/core": patch
---

Retry unanswered frame load requests when the same document republishes its tools, so a re-registered cross-origin provider can recover without another iframe load. Ignore late load responses after a replacement document takes over.
