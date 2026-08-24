---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
---

docs: name `@assistant-ui/ai-sdk` in JSDoc examples

the import examples on `injectQuoteContext`, `unstable_injectInteractableContext`, and the interactable and message JSDoc pointed at `@assistant-ui/react-ai-sdk`. they now name the framework-neutral package, which is where these live; the old package re-exports it, so both imports resolve.
