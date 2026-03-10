---
"@assistant-ui/core": patch
"@assistant-ui/react-langgraph": patch
---

fix: normalize attachment-only sends for langgraph

Attachment-only user sends now normalize to include a minimal text part alongside file content. This prevents duplicate/invalid message payloads and improves compatibility with backends that require text + document blocks (for example, Bedrock Converse).
