---
"generative-frame": patch
---

Add `confirm: true` on catalog actions and the `confirmAction` callback on `SpecRenderer` and `createSpecToolkit` for host confirmation before dispatch. A declined confirmation stops the action list, a protected action fails without `confirmAction`, and `watch` cannot dispatch one.
