---
"assistant-stream": patch
---

fix: cancel polyfilled stream iterators before their first read and forward the cancellation reason.

The fallback now acquires the reader when `[Symbol.asyncIterator]()` is called, so `stream.locked` becomes `true` before the first `next()`, matching native stream iteration.
