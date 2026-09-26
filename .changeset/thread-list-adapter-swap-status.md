---
"@assistant-ui/core": patch
---

fix: stop a delete, archive, unarchive, rename or custom metadata update still running on the previous thread list adapter from changing the new adapter's thread with the same id
