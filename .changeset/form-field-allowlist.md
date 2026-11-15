---
"@assistant-ui/react-hook-form": patch
---

`set_form_field` only sets fields the form currently renders. Names that are not mounted, and fields kept out of the model context (password, one-time-code and card inputs, `assistant.sensitiveFields` and anything under them), now return `{ success: false }` and leave the form unchanged. `items[0].name` and `items.0.name` both work.
