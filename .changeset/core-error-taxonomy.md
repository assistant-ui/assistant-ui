---
"@assistant-ui/core": patch
---

feat: AssistantError taxonomy with severity and display metadata propagated through run error status. behavior note: local runtime run failures now store a structured AssistantError object in message status.error instead of a plain string; useMessageError keeps returning a human-readable string for both shapes, and code reading status.error directly should use isAssistantError or toAssistantError
