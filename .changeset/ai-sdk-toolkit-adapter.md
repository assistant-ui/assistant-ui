---
"@assistant-ui/react-ai-sdk": patch
---

feat: add `generativeTools({ toolkit, frontendTools })` — builds an AI SDK `ToolSet` from an assistant-ui toolkit (server-side `execute`) merged with the frontend-uploaded tools, for use in `streamText`/`generateText`. Pairs with the `"use generative"` compiler so a backend tool's `execute` runs on the server while its `render` ships to the client.
