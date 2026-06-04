---
"@assistant-ui/react-ink": patch
---

feat: `defineToolkit` and the tool markers (`hitlTool` / `stubTool` / `providerTool` / `externalTool`) now have runtime implementations in `@assistant-ui/react-ink`, so Ink apps author tools with the same `defineToolkit` API as the web. An Ink app runs in a single Node process with no client/server boundary, so there is nothing for the `"use generative"` compiler to split: `defineToolkit` resolves each tool's `type` at runtime and no build step is required.
