---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

Warn instead of throw on recoverable inconsistencies: duplicate same-priority tool registrations overwrite with the latest definition, duplicate message ids skip linking, stale client lookup indices are clamped, and null tool names in tool result messages are tolerated.
