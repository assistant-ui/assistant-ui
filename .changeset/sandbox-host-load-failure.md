---
"@assistant-ui/react": patch
---

fix: report a sandboxed frame that never finishes loading through onError, and re-export the `ShimLoadError` and `ShimLoadErrorCode` types it is reported with
