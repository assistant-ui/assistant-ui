---
"@assistant-ui/core": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-opencode": patch
---

fix: wrap a file part payload that is not a parsable url

`getPromptParts` put `FileMessagePart.data` straight into the OpenCode file part's `url`. OpenCode forwards that into an AI SDK file part (`sst/opencode`, `session/message-v2.ts`), whose `url` reaches an unguarded `new URL()`, so a payload that is raw base64 rather than a data URL or an http source failed there. A non-parsable payload is now wrapped in a `data:<mime>;base64,` envelope; data URLs and http sources are forwarded untouched, and a `sourceType: "id"` reference is left alone so it fails loudly instead of shipping a corrupt payload.

The predicate behind that decision moves to `isParsableUrl` in `@assistant-ui/core/internal`, next to the `httpUrlPattern` and `parseDataUrl` it belongs with, and react-ai-sdk now imports it instead of keeping its own copy. No behavior change there.
