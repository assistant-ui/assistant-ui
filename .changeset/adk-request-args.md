---
"@assistant-ui/react-google-adk": patch
---

fix: give a function call that arrives without `args` an empty args object, so an args-less call no longer renders as a tool call with undefined `args` and `argsText`
