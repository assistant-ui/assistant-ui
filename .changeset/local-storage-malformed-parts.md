---
"@assistant-ui/core": patch
---

fix: keep local storage threads loadable when a stored message holds a malformed part, attachment, or nested tool call message; the unreadable entry is dropped and the rest of the message and its descendants still load.
