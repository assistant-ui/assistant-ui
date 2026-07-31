---
"@assistant-ui/react-google-adk": patch
---

fix: stop mangling file parts that carry an audio mime type

Outbound, the `file` branch forwarded `data` verbatim into Gemini `inlineData.data`, which takes bare base64, while the `audio` branch stripped the data URL envelope first. A `file` part carrying a data URL therefore shipped `data:audio/wav;base64,...` as the payload. Both branches now strip it.

The `file` branch also now infers a url source from an unmarked `http(s)` payload, matching the four sibling converters; previously only an explicit `sourceType: "url"` took that leg, so a plain URL was sent as if it were base64.

Inbound, a user-role `file` part with no filename and a mime type of exactly `audio/mp3` or `audio/wav` was reclassified into the deprecated `Unstable_AudioMessagePart`, so a caller following the `file` plus `audio/*` convention got a different part type back than it sent. File parts now stay file parts, which also means an audio file part on an assistant message survives instead of being dropped.
