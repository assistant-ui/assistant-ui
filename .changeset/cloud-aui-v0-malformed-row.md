---
"@assistant-ui/core": patch
---

fix: keep cloud aui/v0 threads loadable when a stored row holds a malformed part, attachment, or nested tool call message. The unreadable row is dropped, surviving descendants of a dropped row are re-rooted, and sanitization is bounded so a deeply nested row cannot overflow the stack. The stored-row part guards are now shared with the local-storage adapter instead of being copied.
