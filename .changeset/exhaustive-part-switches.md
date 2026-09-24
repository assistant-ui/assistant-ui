---
"@assistant-ui/core": patch
---

fix(core): a message part type that the part renderer or `fromThreadMessageLike` does not handle is now a type error, and `ThreadMessageLike` content accepts every part of `ThreadAssistantMessagePart` and `ThreadUserMessagePart`
