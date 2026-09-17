---
"@assistant-ui/core": patch
---

fix: accept explicitly undefined optional metadata on user and system thread messages, so a `ThreadUserMessage` or `ThreadSystemMessage` value is assignable to `ThreadMessage` under `exactOptionalPropertyTypes`
