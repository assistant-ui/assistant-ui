---
"@assistant-ui/react-lexical": patch
---

fix: declare `lexical` and the `@lexical/*` packages as peer dependencies, so the app resolves one copy of lexical and custom plugins passed as `LexicalComposerInput` children find the composer context
