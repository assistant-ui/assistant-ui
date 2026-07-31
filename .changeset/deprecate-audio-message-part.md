---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

docs: deprecate Unstable_AudioMessagePart in favour of file parts

Audio belongs on a `file` part with an `audio/*` mime type. `file` is a member of both the user and assistant unions, carries a filename, and supports url and id references through `sourceType`, none of which the audio part can express. The audio part and the `Unstable_Audio` slot stay honored everywhere they are accepted and will not gain fields.
