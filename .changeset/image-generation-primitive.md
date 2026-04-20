---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/ui": patch
---

Image generation primitive (v0.1): enrich `ImageMessagePart` with optional
generation metadata (`prompt`, `revisedPrompt`, `model`, `seed`, `width`,
`height`, `mimeType`, `generationId`); add `ImageGenerationAdapter`
interface and new hooks `useImageGeneration`, `useImagePartRegenerate`
(with 1s debounce and 5/min rate limit defaults), `useImagePartDownload`,
`useImagePartCopy`. Ship AI SDK image adapter (wrapping `generateImage`)
and a mock adapter for tests. Extend
`auiV0Encode`/`auiV0Decode` to preserve all new optional fields. Relax
image URI validation in `thread-message-like` to accept `https://` and
`blob:` URLs in addition to `data:` URIs. Extend the `@assistant-ui/ui`
`Image` component with loading, content-filter error, and action button
states.
