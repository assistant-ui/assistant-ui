---
"@assistant-ui/core": patch
---

Restore the MessageRepository duplicate-id throw (it detects internal corruption); duplicate ids in an external-store messages array are now deduped at ingestion with a warning, keeping the last occurrence.
