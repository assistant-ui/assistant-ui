---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
---

A tool-call part carries `responseDeliveryStatus: "queued"` while the runtime holds its reply and has not sent it. The ADK runtime sets it on interrupt replies and tool answers held for the next turn, so the tool UI no longer shows them as sent.
