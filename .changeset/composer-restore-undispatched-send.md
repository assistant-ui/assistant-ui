---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: give the composer its draft back when a send never reached the backend. a runtime that rejects `onNew` or `onEdit` with the new `MessageNotSentError` restores the text, quote, and attachments the composer cleared at dispatch time, as long as the user has not typed since; `thread.append` reads the same error as a control signal rather than surfacing it. this is the send-time counterpart of what `cancelRun` already does for a trailing user message.
