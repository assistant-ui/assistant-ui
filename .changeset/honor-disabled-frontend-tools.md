---
"assistant-stream": patch
"@assistant-ui/core": patch
---

Honor `disabled: true` when a frontend tool is called. Until now `disabled` only kept the tool's schema from the model. A call that names a disabled tool now gets the error result `Tool "<name>" is disabled.` and `execute` and `streamCall` do not run, including for tools that only define `streamCall`. Frame tools behave the same way. Set `disabled: false` to run the tool again.
