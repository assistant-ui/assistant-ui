---
"@assistant-ui/cloud-ai-sdk": patch
---

fix: abort active chats after the Cloud chat runtime unmounts without
recording teardown as a user stop, while preserving content already streamed
