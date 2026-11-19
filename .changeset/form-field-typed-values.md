---
"@assistant-ui/react-hook-form": patch
---

`set_form_field` accepts numbers and booleans, so the assistant can check a checkbox and fill a Controller field that holds a number or boolean; fields backed by text inputs, selects, textareas and radio groups still receive strings, which React Hook Form's `valueAs*` options convert as they do for typed input. `set_form_field` render args now type `value` as `string | number | boolean`, so a renderer annotated with `value: string` has to widen it.
