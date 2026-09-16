---
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
---

feat: voice transcripts persist into the useChat messages through onVoiceTranscript. the external message converter keeps a voice transcript as its own message instead of joining it into the neighbouring assistant message, and the history adapter stores a transcript as it lands instead of waiting for the next text run
