---
"generative-frame": patch
---

fix: `read_me`'s description and the widget instructions ask for it before the first `show_widget` call instead of the first widget, `render_spec`'s description points at spec guidance in the system prompt before the `spec` module, and with `preload` the instructions name the preloaded modules and tell the model not to load them again, so a model with the spec guidance preloaded skips the redundant `read_me` round trip before `render_spec`.
