---
"@assistant-ui/react-generative-ui": patch
---

fix: the A2UI converter evaluates function call values (`formatString` with its `${...}` expressions, `formatNumber`, `formatCurrency`, `formatDate`, `pluralize`, `and`, `or`, `not`), including inside an action's `context` and a `functionCall`'s `args`, and resolves relative binding paths against the current template item; any other function in a value is skipped with a warning
