---
"generative-frame": patch
---

fix: `validateSpec` reports a `state` that is not an object with the new `invalid-state` issue code, so `render_spec` asks the model to fix a complete spec whose state is a string, an array, or null.
