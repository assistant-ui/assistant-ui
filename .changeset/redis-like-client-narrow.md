---
"assistant-stream": patch
---

refactor: drop the redis client members the resumable store never calls

`RedisLikeClient` no longer declares `set`, `expire`, `exists` or `xAdd`, `PipelineCommand` no longer has a `"set"` variant, and `NodeRedisLike` no longer requires `expire`, `exists`, `xAdd` or the non-NX `set` overload; no public API accepts a `RedisLikeClient`, so this only affects code that typed a value against the interface directly.
