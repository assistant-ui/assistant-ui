---
"@assistant-ui/react-ink": patch
---

fix(react-ink): block Enter submission while the thread is running unless the runtime supports queueing. `ComposerInput` called `composer().send()` unconditionally, so pressing Enter mid-run interrupted the active stream even on runtimes with `capabilities.queue: false`. It now applies the same gate as the web `ComposerInput` (`isRunning && !capabilities.queue` no-ops, keeping the typed text). The `onSubmit` override path is unaffected; apps using it own their submit behavior.
