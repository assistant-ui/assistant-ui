---
"generative-frame": patch
---

fix: an element whose component threw renders again once the element changes, in the React and Vue spec renderers, so a value it rejected while the spec was still streaming, such as an `Image` `src` bound to a state path cut short at `/tools`, no longer leaves its placeholder after the path completes.
