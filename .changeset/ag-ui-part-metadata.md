---
"@assistant-ui/react-ag-ui": patch
---

feat: send a part's `providerMetadata.agui` as the AG-UI content item's `metadata`. An image or file part, whether it sits on the message or inside an attachment, now reaches the agent with whatever the host put in that namespace; a file part's own `filename` still wins over a key of the same name. Text is unchanged, its AG-UI schema has no metadata field.
