---
"@assistant-ui/react": patch
---

feat: add arrow-key navigation to the thread list

Every item stays a native Tab stop; arrow keys are layered on top. Up/Down move
between items, Right focuses an item's "More" button, and from there Right (or
Down) opens its menu while Left/Escape close it. RTL mirrors Left/Right.
