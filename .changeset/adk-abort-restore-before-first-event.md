---
"@assistant-ui/react-google-adk": patch
---

Stopping an edit or reload, or superseding it with a new send, before its run produces its first event restores the turn it truncated, as a failure before the first event already does.
