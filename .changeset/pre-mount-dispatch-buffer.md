---
"@assistant-ui/tap": patch
---

fix: buffer dispatches that arrive before a resource's first commit instead of throwing "Resource updated before mount". React flushes passive effects child-first, so a descendant's mount effect can legitimately dispatch on a resource before its ancestor host commits it; such dispatches are now replayed in FIFO order at first commit.
