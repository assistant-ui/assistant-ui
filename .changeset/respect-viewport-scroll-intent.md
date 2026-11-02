---
"@assistant-ui/store": patch
---

clear completed bottom-scroll requests when the viewport is already pinned so later content growth respects `autoScroll={false}`.

preserve upward reader scrolling when the viewport resizes in the same frame.
