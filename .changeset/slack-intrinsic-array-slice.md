---
"@assistant-ui/react-generative-ui": patch
---

fix: bound the Slack decoder and the spec pre-pass by index so a replaced slice or Symbol.species cannot defeat their caps
