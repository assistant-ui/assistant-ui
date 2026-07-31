---
"@assistant-ui/react-ai-sdk": patch
---

fix: wrap bare base64 file and image payloads in a data URL envelope

`convertToModelMessages` passes a file part's `url` to an unguarded `new URL()`, so a `FileMessagePart` or `ImageMessagePart` whose payload is raw base64 rather than a data URL or an http source rejected with `Invalid URL`. Both branches now wrap a non-URL payload using the part's own media type; data URLs and http sources are still forwarded untouched.
