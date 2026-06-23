---
"@assistant-ui/react-native": patch
---

fix(react-native): stop IME composition from breaking the web composer input

two related IME regressions on the rn-web `ComposerInput` (#4506, #4510):

- #4506: typing a CJK/IME composition was interrupted mid character. `onChangeText` called `aui.composer().setText(value)`, which the tap scheduler defers to a macrotask, so the controlled `value={text}` stayed stale while react-dom reconciled the textarea and reset it back, killing the in flight composition buffer. now wraps `setText` in `flushTapSync` on web so the controlled value is synced synchronously before react can write the stale value back, mirroring the web `ComposerPrimitive.Input`.
- #4510: pressing Enter to commit an IME candidate submitted the message instead of only confirming it. rn-web forwards the raw dom keydown to `onKeyPress` before its own composition guard, so the Enter branch fired while `isComposing`/`keyCode === 229` was set. now bails out of the submit branch when the forwarded `nativeEvent` reports an active composition, matching rn-web's own `isEventComposing`.

both only affect the web path; native iOS/Android keep the existing behavior.
