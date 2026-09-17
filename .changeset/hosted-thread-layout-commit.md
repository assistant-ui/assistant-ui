---
"@assistant-ui/core": patch
---

fix: commit remote thread runtimes before descendant layout effects, so a layout effect can update a thread on its first render. effects inside a `useRemoteThreadListRuntime` runtime hook now run before paint instead of after it.
