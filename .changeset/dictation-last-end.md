---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

keep how a dictation session ended. Composer state gains `lastDictationEnd` (`{ reason, error?: AssistantError }`), set when a session ends and cleared before the next adapter listen attempt, so a UI can explain a failed dictation after `dictation` returns to `undefined`. The ended `DictationAdapter.Status` gains `error?: unknown`, which the composer normalizes to `AssistantError`, and `WebSpeechDictationAdapter` fills it with the browser's `{ code, message }` (for example `not-allowed` for a blocked microphone). `DictationEnd` is exported.
