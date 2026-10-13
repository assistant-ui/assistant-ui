---
"generative-frame": patch
---

fix: `read_me`'s description and the widget instructions ask for it before the first `show_widget` call instead of the first widget, `render_spec`'s description points at spec guidance in the system prompt and at the `spec` module only when `read_me` offers it, the widget guidance's module index asks only for modules the instructions do not already include, with `preload` the instructions name the preloaded modules and tell the model not to load them again, and with `render_spec` they say that a spec answer needs no `read_me` module other than `spec`, so a model with the spec guidance preloaded skips the redundant `read_me` round trip before `render_spec`.
