---
"@assistant-ui/react-ag-ui": patch
---

feat: round-trip a part's `providerMetadata.agui` through AG-UI's content `metadata`. An image or file part, whether it sits on the message or inside an attachment, now reaches the agent with whatever the host put in that namespace, and an inbound item puts it back on the rebuilt part, so a snapshot echo resends it instead of dropping it. A file part's own `filename` still wins over a key of the same name. Text is unchanged, its AG-UI schema has no metadata field.
