---
"@assistant-ui/ai-sdk": patch
---

fix: an approval the host answers through `onRespondToToolApproval` is stored with its message (under `__aui_toolApprovalResponses` in the stored copy's metadata, never in the chat's messages) and shows as answered after a reload
