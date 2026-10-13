---
"@assistant-ui/core": patch
---

fix: cancelling an idle external-store thread no longer takes its last user message back into the composer, and a message sent right after a stop that took the unanswered message back is no longer lost
