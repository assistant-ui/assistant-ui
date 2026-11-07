---
"generative-frame": patch
---

Limit rendered specs to 5000 elements and 64 levels to prevent runaway repeats from freezing the interface. The React renderer no longer passes `slots.default` to components, matching the Vue renderer, since `children` is the default slot.
