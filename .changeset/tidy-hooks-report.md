---
"assistant-stream": patch
---

Stop reporting an error thrown after a synchronous tool execution or stream `execute` succeeds as a failure of that execution; it now propagates to the caller, as it already did for asynchronous ones.
