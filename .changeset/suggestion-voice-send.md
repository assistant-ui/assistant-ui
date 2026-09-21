---
"@assistant-ui/core": patch
---

fix: suggestion chips with `send` follow the voice session's `canSendText` instead of the run state, so a chip clicked during a spoken reply sends its prompt into a connected session that takes typed text, and stays disabled while the session cannot
