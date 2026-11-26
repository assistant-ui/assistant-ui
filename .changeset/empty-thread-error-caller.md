---
"@assistant-ui/core": patch
---

The error a thread method throws before the thread's runtime has mounted now points at the call that came too early: it is created at each throw, so its stack includes the frame of your code that made the call. Its message says when the placeholder thread is in place (while the thread list loads, and while an opened thread mounts) and what to do instead: call the method from an event handler, or wait until `useAuiState((s) => s.thread.isLoading)` is false. The readonly thread's error is also created where it is thrown.
