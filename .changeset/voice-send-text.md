---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat(core): let typed text enter a connected voice session through `sendText`

a `RealtimeVoiceAdapter.Session` (and the `VoiceSessionControls` returned to `createVoiceSession`) can implement `sendText(text)`. while a running session takes typed text, `VoiceSessionState.canSendText` is true, the thread composer can send, and `thread.append` with a plain text user message hands the text to the session and commits it once as a typed turn (no `metadata.modality`) through the same path as a finalized transcript: the local runtime writes it to the repository and history, an external store receives it through `onVoiceTranscript`. the session must not echo the typed text through `onTranscript`. a session without `sendText` keeps rejecting typed sends as before. while a session is connected the send button and the Enter key follow `canSend` alone, so a reply being spoken no longer blocks them. the ai-sdk runtime keeps the message's own modality when it persists a voice session message, so a typed turn is no longer marked as spoken.
