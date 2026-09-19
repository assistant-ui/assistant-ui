---
"@assistant-ui/core": patch
"@assistant-ui/react-data-stream": patch
---

fix: let cancellation interrupt asynchronous request preparation and keep later resolver failures out of `onError`
