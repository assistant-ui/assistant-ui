---
"@assistant-ui/react-google-adk": patch
---

fix: `useAdkSubmitAuth` answers the pending `adk_request_credential` call with its auth config carrying the credential as `exchangedAuthCredential`, the reply ADK resumes the tool on; an id that is not a pending request throws
