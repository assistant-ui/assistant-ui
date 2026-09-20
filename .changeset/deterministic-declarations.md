---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/core": patch
"@assistant-ui/eve": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-native": patch
---

fix: emit declarations from one TypeScript program so two builds of the same commit produce the same `.d.ts`

`aui-build` now emits the unbundled `.d.ts` output itself through the TypeScript API, in one pass over the sorted entry list, and rewrites relative import specifiers to the emitted `.js` files. The per-module emit that tsdown's declaration plugin ran in rolldown's load order let union member order, alias visibility and import specifiers move between builds. Reference directives that must reach the published declarations carry `preserve="true"` in the source, which the declaration emitter honors instead of a post-build reinjection. Declarations import barrels as the source does and keep `import type`; the exported types are unchanged.
