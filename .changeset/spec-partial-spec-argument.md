---
"generative-frame": patch
---

fix: a `render_spec` call that streams a complete `spec` argument no longer crashes the renderer while the argument has a `root` but no `elements` yet, in the assistant-ui spec toolkits for the web, React Native, and Vue, which now give such a spec an empty `elements` object until its elements arrive.
