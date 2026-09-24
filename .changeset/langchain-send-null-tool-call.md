---
"@assistant-ui/react-langchain": patch
---

fix: skip null tool call entries when cancelling pending tool calls on send, instead of throwing before the new message is submitted
