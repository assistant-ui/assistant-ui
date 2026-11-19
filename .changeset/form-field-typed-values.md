---
"@assistant-ui/react-hook-form": patch
---

`set_form_field` accepts numbers and booleans, not only strings, so the assistant can fill number inputs, checkboxes and switches. `setValue` stores the value as given and React Hook Form does not convert it, so a string-only argument left those fields with a value their resolver rejects and `submit_form` then reported invalid fields.

A field that stores text keeps its string form: a text input, a textarea, a select and a radio group receive `"42"` from a `42`, so string forms behave as before. The element decides that rather than the stored value, because a radio group holds `null` until an option is chosen and would otherwise take a number that no option matches. A number, checkbox or switch field keeps the number or boolean.

`set_form_field` render args now type `value` as `string | number | boolean`. A consumer whose renderer was annotated with `value: string` has to widen that type.
