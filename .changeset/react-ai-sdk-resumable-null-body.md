---
"@assistant-ui/react-ai-sdk": patch
---

fix: pass null-body-status responses through the resumable fetch wrapper instead of reconstructing them, avoiding a `TypeError` on WebKit when a 204/205/304 carries a non-null empty body
