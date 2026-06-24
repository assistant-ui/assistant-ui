---
"@assistant-ui/x-generative-compiler": patch
---

feat: improve toolkit spread compiler error messages

Tighten imported toolkit spread validation so generative modules without a default
`defineToolkit({ ... })` or `defineMcpToolkit({ ... })` export now fail with a
targeted diagnostic instead of being treated as safe.
