---
"assistant-stream": patch
---

fix: prevent stale Redis producers from finalizing replacement streams

`RedisLikeClient` now requires a `finalizeIfUnchanged` method; no public API accepts a `RedisLikeClient`, so this only affects code that typed a value against the interface directly.
