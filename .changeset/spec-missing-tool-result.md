---
"generative-frame": patch
---

fix(generative-frame): warn with `missing-tool-result` from `render_spec` when a spec shows a `/tools` path the stored tool results do not have, so a model that read the value from output the thread does not store writes it into the spec instead of showing a blank
