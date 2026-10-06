---
"@assistant-ui/x-generative-compiler": patch
---

keep unused classes whose static blocks, static initializers, computed keys, or `extends` expressions run code, and unused JSX whose attributes or children call code, when pruning compiled output
