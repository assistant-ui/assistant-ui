---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: give the composer its draft back when a send never reached the backend. a runtime that rejects `onNew` with the new `MessageNotSentError` restores the text, quote, and attachments the composer cleared at dispatch time, as long as nothing has claimed the composer since. that guard and that outcome are the ones `cancelRun` already applies to a trailing user message, so whichever fires first keeps the composer, and of several drafts queued behind one turn only the most recent is still restorable. an edit composer closes at dispatch, so a rejected edit is not restored.
