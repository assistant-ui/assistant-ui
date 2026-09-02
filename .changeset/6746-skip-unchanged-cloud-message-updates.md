---
"@assistant-ui/ai-sdk": patch
---

fix(ai-sdk): stop re-sending a persisted message whose content is unchanged

returning to an earlier branch and continuing the conversation no longer re-sends an identical `update` for the messages already on that branch. with cloud persistence the redundant write for the user message was rejected with a 409 and retried on every later run stop. an update is now issued only when the encoded payload actually differs from what was last written.
