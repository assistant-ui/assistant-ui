---
"generative-frame": patch
---

feat: `resolveSpec(spec, { state })` resolves a spec into the element tree the renderer draws for one state, with conditions, `repeat`, and expressions applied and action params resolved, for targets that cannot run a renderer. The React and Vue renderers now share its slot and `repeat` helpers.
