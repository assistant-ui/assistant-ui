---
"@assistant-ui/core": patch
---

fix: derive requires-action for pending and interrupted tool calls in the external-store convertMessage path; messages with unresolved tool calls now report requires-action instead of complete
