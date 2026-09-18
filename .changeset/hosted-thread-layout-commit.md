---
"@assistant-ui/core": patch
---

fix: commit remote thread runtimes before the layout effects of `AssistantRuntimeProvider`'s children, so a layout effect there can update a thread on its first render. effects inside a `useRemoteThreadListRuntime` runtime hook now run before paint instead of after it.
