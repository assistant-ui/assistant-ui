---
"generative-frame": patch
---

feat: the spec guidance now teaches how to compose an answer (the takeaway first, a `Card` for each module, key figures side by side, and a `Map`, `Timeline`, `Steps`, `Table`, or `Image` where the content calls for one), naming only the components a catalog has and only uses their slots and events allow, and no longer caps a spec at about 30 elements. `render_spec`'s description carries these rules and the app's `customRules`, and `createSpecTools` takes `customRules`, so the rules hold even when a model never loads the `spec` module.
