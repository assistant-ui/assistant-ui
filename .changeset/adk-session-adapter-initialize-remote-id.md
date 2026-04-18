---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): return the ADK session id as `remoteId` from `createAdkSessionAdapter().initialize()`. Previously the input `threadId` (an internal `__LOCALID_*`) was returned, so later `delete(remoteId)` calls hit `/sessions/__LOCALID_*` and 404'd — masked by the adapter's tolerated 404 on delete.
