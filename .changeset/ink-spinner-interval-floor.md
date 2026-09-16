---
"@assistant-ui/react-ink": patch
---

fix: clamp the loading spinner's frame interval to 16ms–2147483647ms, so a zero, negative, NaN, or oversized `intervalMs` can no longer redraw the terminal at the runtime's 1ms floor
