---
"@assistant-ui/core": patch
---

fix: drop a voice transcript or typed turn whose thread runtime is replaced or unmounted before it commits. one held for a pending history load no longer waits forever, so a typed turn's `append` resolves, and a typed turn still sending is no longer written to the replaced runtime's history or handed to its `onVoiceTranscript`
