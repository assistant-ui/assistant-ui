---
"@assistant-ui/react-ink": patch
---

fix: clamp the loading spinner's frame interval so a non-positive `intervalMs` cannot spin the terminal at the runtime's 1ms floor
