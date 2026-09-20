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

`aui-build` now emits the unbundled `.d.ts` output in one TypeScript pass over the whole package, so two builds of the same commit produce identical declarations; the per-module emit it replaced followed the bundler's load order and let union member order, alias visibility and import specifiers move between builds. Declarations import barrels as the source does and keep `import type`; the exported types are unchanged. A `/// <reference>` directive that must reach the published declarations now carries `preserve="true"` in the source.
