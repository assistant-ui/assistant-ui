---
"assistant-ui": patch
---

fix: resolve create-time assistant-ui components through style-aware registry URLs

`assistant-ui create` now passes the same `r.assistant-ui.com` item URLs as `assistant-ui add`, instead of `@assistant-ui/<name>` names that depend on shadcn interpolating `components.json`.
