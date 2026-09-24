---
"@assistant-ui/react-ag-ui": patch
---

fix: report an `HttpAgent` network failure to `onError` once, and keep an answer that already finished complete when the connection drops afterwards
