---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: wire `threads.reloadMainThread()` through the tap `ExternalThread` path via a new `onRefetchThread` callback, with the `refetchThread` capability derived from its presence
