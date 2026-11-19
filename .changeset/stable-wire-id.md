---
"@assistant-ui/react-ag-ui": patch
---

A live assistant message keeps its row mounted when the agent first names it; the agent's id moves to `metadata.custom.agui.messageId` and is still what outbound history and snapshot reconciliation use.
