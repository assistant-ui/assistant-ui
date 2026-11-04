---
"assistant-stream": patch
---

Stop a synchronous `thenHandler` error from being reported as a failed callback in `withPromiseOrValue`, matching the asynchronous branch.
