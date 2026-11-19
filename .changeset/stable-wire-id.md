---
"@assistant-ui/react-ag-ui": patch
---

A locally created assistant message keeps its row mounted when the agent first names it; the agent's id moves to `metadata.custom.agui.messageId` and is still what outbound history and snapshot reconciliation use. History writes keep their persisted record ids and parent links, and history bookkeeping no longer carries over between threads.
