---
"@assistant-ui/react-generative-ui": patch
---

a DatePicker with its own action dispatches it once per committed value: a pick from the native picker commits at once, and a typed value commits on blur or on Enter outside a form, instead of dispatching every intermediate value while typing
