---
"generative-frame": patch
---

fix: a `render_spec` call whose `spec` argument streams in with a `root` before its `elements` no longer crashes the renderer, in the assistant-ui spec toolkits for the web, React Native, and Vue, which now give such a spec an empty `elements` object until its elements arrive, and a later patches call with the same title builds on it.
