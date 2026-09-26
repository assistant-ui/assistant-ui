---
"@assistant-ui/react-generative-ui": patch
---

fix: the A2UI converter maps a `ChoicePicker` without a `variant` to `RadioGroup` like the spec default `mutuallyExclusive`, maps `multipleSelection` to `CheckboxGroup` with every selected value, and turns a `functionCall` button action into an `a2ui:functionCall` `$action`; an action it cannot read now warns
