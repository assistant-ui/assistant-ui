---
"@assistant-ui/ai-sdk": patch
---

fix(ai-sdk): stop re-sending a persisted message whose content is unchanged

run stop persistence decided what to write by comparing external store object identity against a baseline rebuilt from the visible branch only. a message that left the visible branch lost its baseline, so returning to that branch made it look changed and re-sent an identical `update` for it (the cloud answers 409 for a user message, and the failure retried on every later run stop). the baseline is now kept per persisted inner message as its encoded storage content, so an update is issued only when the payload actually differs.
