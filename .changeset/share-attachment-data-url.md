---
"@assistant-ui/core": patch
"@assistant-ui/react-ai-sdk": patch
---

fix: make the default attachment adapter work without FileReader (Node, react-ink, SSR) by sharing a single getFileDataURL from @assistant-ui/core/internal, whose base64 fallback chunks large inputs and works on runtimes without Buffer
