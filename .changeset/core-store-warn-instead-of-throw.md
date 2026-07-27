---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
---

Warn instead of throw on recoverable inconsistencies: duplicate same-priority tool registrations merge with the latest registration taking precedence, duplicate message ids skip linking, stale client lookup indices are clamped, and null tool names in tool result messages are tolerated.
