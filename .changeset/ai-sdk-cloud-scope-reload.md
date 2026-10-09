---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
---

Reload Cloud threads when AISDKThreads changes Cloud client or workspace scope. Preserve a new controlled thread selection requested with the replacement adapter without overriding a later manual switch. Unchanged selections from the previous scope still reset.
