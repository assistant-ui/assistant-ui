---
"assistant-stream": patch
---

fix: `toGenericMessages` no longer throws on a message without `content`, an attachment without `content`, or a null part or attachment; it skips what is missing and converts the rest of the conversation.
