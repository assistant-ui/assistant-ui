---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

docs: deprecate Unstable_AudioMessagePart in favour of file parts

Audio belongs on a `file` part with an `audio/*` mime type, which reaches the same provider audio inputs, exists on both the user and assistant unions, carries a filename, and supports url and id references. The audio part and the `Unstable_Audio` slot stay honored everywhere they are accepted and will not gain fields.
