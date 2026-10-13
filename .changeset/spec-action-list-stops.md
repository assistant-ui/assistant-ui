---
"generative-frame": patch
---

fix: an action list in a spec stops at the first action that fails, so a `setState` that confirms a host action runs only when that action succeeded. The failure is still reported to `onError`.
