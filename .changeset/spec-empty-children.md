---
"generative-frame": patch
---

fix: `validateSpec` accepts an empty `children` or slot list on a component without that slot, since it adds nothing, so a repair that empties the list fixes the error instead of repeating it.
