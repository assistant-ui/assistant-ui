---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: `aui.thread().append({ startRun: false })` no longer triggers a run on external-store runtimes

`ExternalStoreThreadRuntimeCore` and the new aui-flavored `ExternalThread` were calling `onNew`/`onEdit` (and `queue.enqueue`) regardless of `message.startRun`. Since `onNew` is the trigger for the user's run logic, callers passing `startRun: false` still saw a run start. The runtime now early-returns when `startRun: false`, matching `LocalThreadRuntimeCore`'s behavior. Callers opting out of the run are responsible for updating their externally-managed `messages` array themselves.
