---
"@assistant-ui/react-hook-form": patch
---

`set_form_field` only sets fields the form renders. Names that are not mounted, and fields kept out of the model context (password, one-time-code and card inputs, and `assistant.sensitiveFields`), now return `{ success: false }` and leave the form unchanged. `items[0].name` and `items.0.name` both work.
