---
"generative-frame": patch
---

fix: the widget instructions ask for `read_me` before the first `show_widget` call instead of the first widget, and with `preload` they name the preloaded modules and tell the model not to load them again, so a model with the spec guidance preloaded skips the redundant `read_me` round trip before `render_spec`.
