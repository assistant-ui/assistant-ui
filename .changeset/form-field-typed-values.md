---
"@assistant-ui/react-hook-form": patch
---

`set_form_field` accepts numbers and booleans, not only strings, so the assistant can fill number inputs, checkboxes and switches. `setValue` stores the value as given and React Hook Form does not convert it, so a string-only argument left those fields with a value their resolver rejects and `submit_form` then reported invalid fields.

The value is written with the type the field already holds: a field that holds a string gets `"42"` from a `42`, so string forms behave as before.

`set_form_field` render args now type `value` as `string | number | boolean`. A consumer whose renderer was annotated with `value: string` has to widen that type.
