---
"@assistant-ui/react-hook-form": patch
---

fix: validate assistant-triggered form submissions before reporting success

Assistant-triggered submissions now respect React Hook Form rules and native constraints before dispatch, while preserving native `noValidate` behavior.
