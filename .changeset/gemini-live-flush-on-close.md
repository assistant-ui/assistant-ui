---
"@assistant-ui/react": patch
---

Flush a Gemini Live reply that is still deferred when the socket closes, instead of dropping its first transcript.
