---
"assistant-stream": patch
---

fix: a stale Redis append or delete no longer changes a stream that was reacquired between the store's metadata read and its write. the node-redis and ioredis adapters run both as compare-and-mutate scripts through `EVALSHA`, and a custom `RedisLikeClient` gets the same protection by implementing the optional `appendIfUnchanged` and `deleteIfUnchanged`.
