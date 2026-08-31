---
"@assistant-ui/react": patch
---

fix: report a sandboxed frame that never finishes loading through onError, and re-export `isShimLoadError` with the `ShimLoadError` and `ShimLoadErrorCode` types it narrows
