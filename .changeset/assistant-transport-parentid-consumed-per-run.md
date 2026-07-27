---
"@assistant-ui/react": patch
---

fix: assistant-transport consumes parentId once per run; later unrelated runs no longer re-send the last append's parentId
