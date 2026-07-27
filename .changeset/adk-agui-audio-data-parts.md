---
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-ag-ui": patch
---

fix: forward audio message parts and skip data parts instead of throwing or silently dropping them, so a user message containing an audio or data part no longer fails the send or loses the audio; reasoning, source, and generative-ui parts still throw as assistant-only caller errors
