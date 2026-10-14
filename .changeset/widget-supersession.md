---
"generative-frame": patch
---

fix: within one message, a widget that a later `show_widget` with the same title replaces, or that a later complete `edit_widget` changes, no longer stays on screen next to its replacement, while an edit that is still streaming or fails leaves the widget in place; earlier messages keep their own widgets, and a superseded call's pending render report resolves at once.
