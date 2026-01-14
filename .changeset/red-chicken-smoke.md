---
"@assistant-ui/react": patch
---

feat(react): add dictation (speech-to-text) support

Adds dictation (speech-to-text) support via a new `DictationAdapter` interface. Users can now convert voice input to text in the composer using the browser's Web Speech API or custom adapters.

- New adapter: `WebSpeechDictationAdapter` - uses browser's Web Speech API
- New components: `ComposerPrimitive.Dictate`, `ComposerPrimitive.StopDictation`, `ComposerPrimitive.DictationTranscript`
- New state: `composer.dictation` for dictation status and transcript
- New methods: `composer.startDictation()`, `composer.stopDictation()`
- Configuration via `adapters.dictation` in runtime options
