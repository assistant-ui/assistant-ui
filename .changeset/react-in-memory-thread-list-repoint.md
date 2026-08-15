---
"@assistant-ui/react": patch
---

fix: InMemoryThreadList restarts with a fresh thread when the last one is deleted, notifies the new onDelete callback, and applies deletes batch-safely; the export is now sourced from the core store entry
