---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): hold HITL replies and addToolResult answers until no run is active, including unrelated runs; answered confirmations and auth requests leave useAdkToolConfirmations and useAdkAuthRequests while held
