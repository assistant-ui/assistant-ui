---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: approval options vocabulary on tool approvals. `ToolCallMessagePart.approval` gains request-supplied `options` (machine-readable kinds allow-once / allow-always / reject-once / reject-always, open to `_`-prefixed custom kinds), a recorded `optionId`, and a terminal `resolution` ("cancelled" | "expired") for non-decision outcomes. `respondToApproval` additionally accepts `{ optionId }`, resolved in core against the option's kind; custom kinds require an explicit `approved`. `ExternalThread` gains an `onRespondToToolApproval` callback. The kit approval bar renders supplied options with an opt-in confirmation step showing the grants an option would persist. Persistence stays host-owned.
