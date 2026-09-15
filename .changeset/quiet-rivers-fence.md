---
"assistant-stream": patch
---

fix: a stale Redis append or delete no longer changes a stream that was reacquired between the store's metadata read and its write. the node-redis and ioredis adapters now run append, finalize, and delete as scripts through `EVALSHA`, so the Redis endpoint must allow `EVALSHA` as well as `EVAL`. a custom `RedisLikeClient` gets the same protection by implementing the optional `appendIfUnchanged` and `deleteIfUnchanged`.
