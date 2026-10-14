---
"generative-frame": patch
---

fix: while a spec streams, an element whose props are invalid keeps its last valid render, or takes no space before it has one, and an unknown type or a component that throws takes no space; each placeholder shows only if the problem remains once streaming ends, so a value cut short by the stream no longer flashes an error box.
