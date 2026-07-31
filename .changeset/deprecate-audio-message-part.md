---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

docs: deprecate Unstable_AudioMessagePart in favour of file parts

Audio belongs on a `file` part with an `audio/*` mime type. `file` is a member of both the user and assistant unions and carries a filename, neither of which the audio part can express. The payload form a `file` part needs is still adapter specific; the message primitive docs enumerate it. The audio part and the `Unstable_Audio` slot stay honored everywhere they are accepted and will not gain fields.
