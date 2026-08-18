---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

fix: stabilize `unstable_useAdapters` results on both adapter faces and warn on an unkeyed history factory. the React host's synthesized provider now absorbs a fresh but shallow-equal adapters bag the same way the `RemoteThreadList` store entry does, reusing the store's `useShallowStable` primitive through its internal entry, and the store entry warns in development when a history adapter arrives while the thread factory is unkeyed, since switching threads would silently keep the first thread's history.
