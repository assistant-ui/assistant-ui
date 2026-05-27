---
"@assistant-ui/core": minor
"@assistant-ui/react": minor
"@assistant-ui/react-ai-sdk": patch
---

feat: pivot Generative UI to OpenUI Lang (`source: string`) with `@openuidev/react-lang` renderer in `@assistant-ui/react`.

**Breaking:** Removed `GenerativeUISpec`, `GenerativeUINode`, `GenerativeUIRender`, `GenerativeUIComponentRegistry`, `GenerativeUIRenderError`. `GenerativeUIMessagePart` now uses `source: string`. `MessagePrimitive.Parts` `components.generativeUI` is a component slot, not an allowlist config.

**Added:** `MessagePrimitive.GenerativeUI` (react), re-exports `defineComponent`, `createLibrary`. `@assistant-ui/react-ai-sdk` exports `extractOpenUILangFromText`.

Maintainer: minor bump approval requested per PR description.
