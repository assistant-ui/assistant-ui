---
"generative-frame": patch
---

fix: a `repeat` over the `/` pointer, the empty-string state key, now gives its items `//0`, `//1`, and so on, so `$bindItem` writes there instead of to numeric keys of the whole state.
