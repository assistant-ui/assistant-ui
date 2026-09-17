---
"@assistant-ui/core": patch
---

fix: keep cloud aui/v0 threads loadable when a stored row holds a malformed part, attachment, or nested tool call message; the unreadable row is dropped and the rest of the history still loads.
