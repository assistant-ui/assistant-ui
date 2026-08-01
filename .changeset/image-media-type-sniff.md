---
"@assistant-ui/react-ai-sdk": patch
---

fix: detect the media type of a bare base64 image instead of assuming png

`getImageMediaType` resolved an explicit `contentType`, then a data URL envelope, then fell back to `image/png`. An `ImageMessagePart` carrying raw base64 has neither, so JPEG, GIF and WebP payloads were all announced to the provider as png. The leading bytes are now read with `detectMediaType` from `@ai-sdk/provider-utils`, the same helper the AI SDK uses internally, and `image/png` remains the fallback when no signature matches.

The sniff only runs on a payload that is not a parsable url, and never propagates a throw: `detectMediaType` raises on input that is not valid base64.
